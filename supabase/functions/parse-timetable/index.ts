import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { requireUser } from "../_shared/auth.ts";
import {
  GENERIC_ERROR,
  corsHeadersFor,
  isText,
  jsonResponse,
  parseAllowedOrigins,
  parseLimit,
} from "../_shared/http.ts";

// Secrets/config (set with `supabase secrets set`): GROQ_API_KEY, ALLOWED_ORIGINS (comma
// separated site origins), AI_DAILY_LIMIT (calls per user per day), GROQ_VISION_MODEL.
const allowedOrigins = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const dailyLimit = parseLimit(Deno.env.get("AI_DAILY_LIMIT"), 50);
// This call sends an image, so it needs a Groq model that accepts images. The value used before
// ("google/gemini-2.5-flash") is not a Groq model. The default below is a Groq vision model as
// of writing; check Groq's current model list and override with GROQ_VISION_MODEL if it moved.
const model = Deno.env.get("GROQ_VISION_MODEL") ?? "meta-llama/llama-4-scout-17b-16e-instruct";

// Input caps, so one request cannot spend an unbounded number of tokens. Tunable.
const MAX_IMAGE_BASE64_CHARS = 6_000_000;
const MAX_CONTEXT_CHARS = 500;
const MAX_SUBJECTS = 50;
const MAX_SUBJECT_NAME_CHARS = 100;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("Origin"), allowedOrigins);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Only real signed-in users may spend AI credits (the public anon key does not count).
    const session = await requireUser(req);
    if (!session) return jsonResponse(401, { error: "Please sign in to use this feature." }, cors);

    let body: { imageBase64?: unknown; additionalContext?: unknown; existingSubjects?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid request." }, cors);
    }
    const { imageBase64, additionalContext, existingSubjects } = body ?? {};

    if (!isText(imageBase64, MAX_IMAGE_BASE64_CHARS)) {
      return jsonResponse(400, { error: "The image is missing or too large." }, cors);
    }
    const hasContext = additionalContext !== undefined && additionalContext !== null && additionalContext !== "";
    if (hasContext && !isText(additionalContext, MAX_CONTEXT_CHARS)) {
      return jsonResponse(400, { error: "The extra notes are too long." }, cors);
    }
    const subjectNames: string[] = [];
    if (existingSubjects !== undefined && existingSubjects !== null) {
      if (!Array.isArray(existingSubjects) || existingSubjects.length > MAX_SUBJECTS) {
        return jsonResponse(400, { error: "The subject list is invalid." }, cors);
      }
      for (const subject of existingSubjects) {
        if (!subject || !isText(subject.name, MAX_SUBJECT_NAME_CHARS)) {
          return jsonResponse(400, { error: "The subject list is invalid." }, cors);
        }
        subjectNames.push(subject.name);
      }
    }

    // Count this call against the user's daily allowance before any paid work starts.
    const { data: allowed, error: quotaError } = await session.client.rpc("consume_ai_quota", {
      p_limit: dailyLimit,
    });
    if (quotaError) {
      console.error("quota check failed:", quotaError);
      return jsonResponse(500, { error: GENERIC_ERROR }, cors);
    }
    if (!allowed) {
      return jsonResponse(429, { error: "Daily AI limit reached. Please try again tomorrow." }, cors);
    }

    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    // Build the prompt with optional additional context and existing subjects
    let userPrompt = 'Please analyze this timetable image and extract ALL periods visible in the image. For each period, provide: subject name, day_of_week (0=Sunday, 1=Monday, etc.), start_time (HH:MM format), end_time (HH:MM format), location (if visible), and teacher (if visible). Return as JSON array with format: [{"subject": "...", "day_of_week": 1, "start_time": "09:00", "end_time": "10:00", "location": "...", "teacher": "..."}]. If you cannot determine a field, omit it or use null.';

    if (subjectNames.length > 0) {
      userPrompt += `\n\nIMPORTANT: The user already has these subjects in their system: ${subjectNames.join(', ')}. When you see subject names or abbreviations in the timetable, try to match them to these existing subjects. For example:
- "CN" could be "Computer Networks"
- "SE" could be "Software Engineering"
- "AISC" could be "Artificial Intelligence and Soft Computing"
- "Predictive Analytics" and "Predictive Analysis" are the same subject
Use the EXACT subject name from this list when there's a clear match. Only create a new subject name if it doesn't match any existing subject.`;
    }

    if (hasContext) {
      userPrompt += `\n\nAdditional context about this timetable: ${additionalContext}`;
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert at parsing timetable images. Extract ALL class periods with their subject names, days of week, start times, end times, locations (if visible), and teachers (if visible). Be thorough and capture every single period visible in the timetable. Pay special attention to abbreviations and match them with full subject names when provided. Pay attention to any additional context provided by the user about time formats, special notations, or conventions used in the timetable. Return the data as a JSON array with ALL periods found.'
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.2,
      }),
    });

    if (!response.ok) {
      // Details go to the function logs only; the caller gets a fixed message.
      const errorText = await response.text();
      console.error('Groq error:', response.status, errorText);
      if (response.status === 429) {
        return jsonResponse(429, { error: 'The AI service is busy. Please try again shortly.' }, cors);
      }
      return jsonResponse(502, { error: GENERIC_ERROR }, cors);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content ?? '';

    // Try to extract JSON from the response
    let periods;
    try {
      // Look for JSON array in the response
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      periods = JSON.parse(jsonMatch ? jsonMatch[0] : aiResponse);
      if (!Array.isArray(periods)) throw new Error('reply is not a list');
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return jsonResponse(
        400,
        { error: 'Could not parse timetable. Please ensure the image is clear and contains a visible timetable.' },
        cors,
      );
    }

    return jsonResponse(200, { periods }, cors);
  } catch (error) {
    console.error('Error in parse-timetable function:', error);
    return jsonResponse(500, { error: GENERIC_ERROR }, cors);
  }
});
