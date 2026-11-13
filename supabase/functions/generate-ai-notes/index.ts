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
const MAX_MATERIAL_CHARS = 60000;
const MAX_USER_PROMPT_CHARS = 1000;
const MAX_PREFERENCE_CHARS = 60;

serve(async (req) => {
  const cors = corsHeadersFor(req.headers.get("Origin"), allowedOrigins);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    // Only real signed-in users may spend AI credits (the public anon key does not count).
    const session = await requireUser(req);
    if (!session) return jsonResponse(401, { error: "Please sign in to use this feature." }, cors);

    let body: { materialContent?: unknown; preferences?: Record<string, unknown>; userPrompt?: unknown };
    try {
      body = await req.json();
    } catch {
      return jsonResponse(400, { error: "Invalid request." }, cors);
    }
    const { materialContent, preferences, userPrompt: rawUserPrompt } = body ?? {};

    if (!isText(materialContent, MAX_MATERIAL_CHARS)) {
      return jsonResponse(400, { error: "The material is missing or too long." }, cors);
    }
    const hasUserPrompt = rawUserPrompt !== undefined && rawUserPrompt !== null && rawUserPrompt !== "";
    if (hasUserPrompt && !isText(rawUserPrompt, MAX_USER_PROMPT_CHARS)) {
      return jsonResponse(400, { error: "The instructions are too long." }, cors);
    }
    const userPrompt = hasUserPrompt ? (rawUserPrompt as string) : "";

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

    const {
      detailLevel: rawDetailLevel = "Standard",
      style: rawStyle = "Exam-ready",
      includeTables = true,
      includeDiagrams = false,
      includeExamples = true,
    } = preferences || {};

    // These two are pasted into the system prompt, so only short values are accepted.
    const detailLevel = isText(rawDetailLevel, MAX_PREFERENCE_CHARS) ? rawDetailLevel : "Standard";
    const style = isText(rawStyle, MAX_PREFERENCE_CHARS) ? rawStyle : "Exam-ready";

    const lengthGuidance = detailLevel === "Brief"
      ? "Generate notes that are between 4000 and 5000 characters in length. Be concise but cover all topics."
      : detailLevel === "Standard"
        ? "Generate notes that are between 7000 and 8000 characters in length. Provide thorough coverage of each topic."
        : "Generate notes that are between 10000 and 12000 characters in length. Provide exhaustive, in-depth coverage of every topic with extensive detail.";

    const imageGuidance = detailLevel === "Brief"
      ? "Do NOT include any images. You may use markdown tables for organizing information."
      : `Include relevant images throughout the notes using markdown image syntax. Use real, publicly accessible image URLs from sources like Wikimedia Commons or educational resources. Format: ![descriptive alt text](https://upload.wikimedia.org/wikipedia/commons/...) or similar public domain image URLs. Include 3-5 relevant images that illustrate key concepts. Also include markdown tables where applicable.`;

    const userInstructions = userPrompt ? `\n\nUSER INSTRUCTIONS (follow these carefully):\n${userPrompt}` : "";

    const systemPrompt = `You are an expert academic note generator. Generate structured, comprehensive, easy-to-understand academic notes in Markdown format.

CRITICAL LENGTH REQUIREMENT:
${lengthGuidance}
You MUST meet the minimum character count. If the content seems short, expand explanations, add more examples, and elaborate on each topic.

Requirements:
- Detail level: ${detailLevel}
- Style: ${style}
- ${includeTables ? "Include markdown tables where applicable to organize information" : "Do not include tables"}
- ${includeDiagrams ? "Include diagram placeholders like [DIAGRAM: description of diagram]" : "Do not include diagram placeholders"}
- ${includeExamples ? "Include practical examples for clarity" : "Keep examples minimal"}

Image requirements:
${imageGuidance}

FORMAT RULES (CRITICAL - follow these exactly):
- Use ## for main headings and ### for subheadings — these MUST render as bold, large headings in Markdown
- ALWAYS use **bold** (double asterisks) for heading text inside ## and ### markers, e.g.: ## **1. Main Topic** and ### **1.1 Subtopic**
- Use bullet points (- ) for key information
- Use **bold** for definitions, important terms, and key vocabulary
- Mark exam-important points with ⚡
- Use horizontal rules (---) between major sections for visual separation
- End with a ## **Summary** section
- Ensure no topic from the source material is skipped
- Expand each section thoroughly to meet the required character count
- Add a blank line after every heading, every bullet point group, every paragraph, and every horizontal rule for proper spacing

VISUAL FORMATTING (CRITICAL - make notes visually engaging and easy to scan):
- Add a brief introductory paragraph at the very start summarizing the topic
- After each ## heading, include a short 1-2 sentence overview before diving into subheadings
- Use nested bullet points (indented with spaces) for hierarchical information
- Use > blockquotes for key definitions or important callouts
- Separate concepts clearly with blank lines and horizontal rules
- Use numbered lists (1. 2. 3.) for sequential processes or steps
- Include comparison sections using tables when comparing two or more concepts
- Make the notes feel like a well-designed textbook chapter, NOT a flat list of facts

CRITICAL - Math and Symbol Formatting:
- NEVER use LaTeX notation like $x$, $\\gamma$, $\\alpha$ etc.
- ALWAYS use actual Unicode characters for Greek letters: α, β, γ, δ, ε, ζ, η, θ, ι, κ, λ, μ, ν, ξ, π, ρ, σ, τ, υ, φ, χ, ψ, ω, Γ, Δ, Θ, Λ, Σ, Φ, Ψ, Ω
- ALWAYS use Unicode math symbols: ×, ÷, ±, ≤, ≥, ≠, ≈, ∞, √, ∑, ∏, ∫, ∂, ∇, ∈, ∉, ⊂, ⊃, ∪, ∩, ∀, ∃, →, ←, ↔, ⇒, ⇐, ⇔, ², ³, ⁴, ₀, ₁, ₂
- For subscripts use Unicode: x₁, x₂, xₙ. For superscripts use Unicode: x², x³, xⁿ
- For fractions, write them inline like "a/b" or use descriptive text
- Variables should be written in plain italic using *x*, *y*, *z* markdown syntax

CRITICAL - Image Verification:
- When including images, ONLY use URLs that you are highly confident are real and accessible
- Prefer well-known Wikimedia Commons URLs with full paths
- NEVER fabricate or guess image URLs — if unsure about an image URL, omit the image entirely
- Every image MUST have descriptive alt text
- Test that the URL pattern matches known Wikimedia/public domain patterns${userInstructions}`;

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
          { role: "user", content: `Generate comprehensive academic notes from the following material. IMPORTANT: Make sure all ## and ### headings are bold using **double asterisks**, add proper spacing (blank lines) between all sections, and only include image URLs you are certain are real and accessible.\n\n${materialContent}` },
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
    console.error("generate-ai-notes error:", e);
    return jsonResponse(500, { error: GENERIC_ERROR }, cors);
  }
});
