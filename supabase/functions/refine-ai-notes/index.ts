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

// Input caps, so one request cannot spend an unbounded number of tokens. Tunable.
const MAX_NOTES_CHARS = 60000;
const MAX_INSTRUCTION_CHARS = 1000;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("Origin"), allowedOrigins);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Only real signed-in users may spend AI credits (the public anon key does not count).
    const session = await requireUser(req);
    if (!session) return jsonResponse(401, { error: "Please sign in to use this feature." }, cors);

    let body: { currentContent?: unknown; instruction?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid request." }, cors);
    }
    const { currentContent, instruction } = body ?? {};

    if (!isText(currentContent, MAX_NOTES_CHARS)) {
      return jsonResponse(400, { error: "The notes are missing or too long." }, cors);
    }
    if (!isText(instruction, MAX_INSTRUCTION_CHARS)) {
      return jsonResponse(400, { error: "The instruction is missing or too long." }, cors);
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

    const systemPrompt = `You are an expert academic note editor. You will receive existing academic notes and a refinement instruction. Apply the instruction to improve the notes while maintaining their structure and completeness.

Rules:
- Keep the same markdown formatting
- Preserve all headings and structure
- Apply the user's refinement instruction precisely
- Do not remove important information unless explicitly asked
- Return the complete refined notes in markdown format`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // Groq requires a model on every request; this call used to send none.
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Here are the current notes:\n\n${currentContent}\n\nRefinement instruction: ${instruction}` },
        ],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...cors, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("refine-ai-notes error:", e);
    return jsonResponse(500, { error: GENERIC_ERROR }, cors);
  }
});
