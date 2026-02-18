import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { materialContent, preferences, userPrompt } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    const {
      detailLevel = "Standard",
      style = "Exam-ready",
      includeTables = true,
      includeDiagrams = false,
      includeExamples = true,
    } = preferences || {};

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
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate comprehensive academic notes from the following material. IMPORTANT: Make sure all ## and ### headings are bold using **double asterisks**, add proper spacing (blank lines) between all sections, and only include image URLs you are certain are real and accessible.\n\n${materialContent}` },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usage limit reached. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("generate-ai-notes error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
