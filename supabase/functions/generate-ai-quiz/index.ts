import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { materialContent, quizLevel } = await req.json();
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
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate a quiz from this material:\n\n${materialContent}` },
        ],
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

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content || "";
    
    // Strip markdown code blocks if present
    content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    
    const quiz = JSON.parse(content);

    return new Response(JSON.stringify(quiz), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-ai-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
