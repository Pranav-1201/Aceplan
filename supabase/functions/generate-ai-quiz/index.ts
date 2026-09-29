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
// separated site origins), AI_DAILY_LIMIT (calls per user per day), GROQ_TEXT_MODEL.
const allowedOrigins = parseAllowedOrigins(Deno.env.get("ALLOWED_ORIGINS"));
const dailyLimit = parseLimit(Deno.env.get("AI_DAILY_LIMIT"), 50);
const model = Deno.env.get("GROQ_TEXT_MODEL") ?? "llama-3.3-70b-versatile";

// Input cap, so one request cannot spend an unbounded number of tokens. Tunable.
const MAX_MATERIAL_CHARS = 60000;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("Origin"), allowedOrigins);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Only real signed-in users may spend AI credits (the public anon key does not count).
    const session = await requireUser(req);
    if (!session) return jsonResponse(401, { error: "Please sign in to use this feature." }, cors);

    let body: { materialContent?: unknown; quizLevel?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid request." }, cors);
    }
    const { materialContent, quizLevel } = body ?? {};

    if (!isText(materialContent, MAX_MATERIAL_CHARS)) {
      return jsonResponse(400, { error: "The material is missing or too long." }, cors);
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

    let mcqCount = 10;
    let subjectiveCount = 0;

    if (quizLevel === "detailed") {
      mcqCount = 15;
      subjectiveCount = 5;
    } else if (quizLevel === "comprehensive") {
      mcqCount = 20;
      subjectiveCount = 10;
    }

    const systemPrompt = `You are an expert quiz generator for academic content. Generate a quiz based on the provided study material.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanation text.

Generate exactly ${mcqCount} MCQ questions${subjectiveCount > 0 ? ` and ${subjectiveCount} subjective questions` : ""}.

JSON structure:
{
  "mcqs": [
    {
      "id": 1,
      "question": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correctAnswer": "A",
      "explanation": "Brief explanation"
    }
  ]${subjectiveCount > 0 ? `,
  "subjective": [
    {
      "id": 1,
      "question": "...",
      "expectedAnswer": "Model answer text",
      "keywords": ["keyword1", "keyword2", "keyword3"],
      "maxMarks": 2
    }
  ]` : ""}
}

Rules:
- MCQs must have exactly 4 options labeled A, B, C, D
- correctAnswer must be just the letter (A, B, C, or D)
- Questions should test understanding, not just recall
- Cover different topics from the material
- Subjective questions should require short paragraph answers
- Keywords should be the key concepts expected in answers
- NEVER use LaTeX notation. Use Unicode for math symbols.`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a quiz from this material:\n\n${materialContent}` },
        ],
      }),
    });

    if (!response.ok) {
      // Details go to the function logs only; the caller gets a fixed message.
      const text = await response.text();
      console.error("Groq error:", response.status, text);
      if (response.status === 429) {
        return jsonResponse(429, { error: "The AI service is busy. Please try again shortly." }, cors);
      }
      return jsonResponse(502, { error: GENERIC_ERROR }, cors);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";

    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();

    let quiz;
    try {
      quiz = JSON.parse(content);
    } catch (parseError) {
      // The model sometimes returns text that is not valid JSON; ask the user to retry.
      console.error("quiz JSON parse failed:", parseError);
      return jsonResponse(502, { error: "The AI returned an unexpected answer. Please try again." }, cors);
    }

    return jsonResponse(200, quiz, cors);
  } catch (e) {
    console.error("generate-ai-quiz error:", e);
    return jsonResponse(500, { error: GENERIC_ERROR }, cors);
  }
});
