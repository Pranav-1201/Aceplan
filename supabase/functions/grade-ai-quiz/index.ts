import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mcqs, subjective, userMcqAnswers, userSubjectiveAnswers } = await req.json();
    const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY is not configured");

    // Grade MCQs locally - exact match
    const mcqResults = (mcqs || []).map((q: any, i: number) => {
      const userAnswer = (userMcqAnswers?.[i] || "").toUpperCase().trim();
      const correct = q.correctAnswer.toUpperCase().trim();
      const isCorrect = userAnswer === correct;
      return {
        questionId: q.id,
        question: q.question,
        userAnswer,
        correctAnswer: correct,
        isCorrect,
        marks: isCorrect ? 1 : 0,
        maxMarks: 1,
        explanation: q.explanation || "",
      };
    });

    let subjectiveResults: any[] = [];
    
    if (subjective?.length && userSubjectiveAnswers?.length) {
      // Use AI to grade subjective answers
      const gradingPrompt = `You are an academic answer grader. Grade the following subjective answers.

CRITICAL: Respond with ONLY valid JSON array. No markdown, no code blocks.

For each answer, evaluate:
- Conceptual accuracy and understanding
- Coverage of key concepts/keywords
- Allow paraphrased answers - don't require exact wording
- Assign marks: 2 (fully correct), 1 (partially correct), 0 (incorrect)

Questions and answers to grade:
${subjective.map((q: any, i: number) => `
Question ${i + 1}: ${q.question}
Expected Answer: ${q.expectedAnswer}
Keywords: ${q.keywords.join(", ")}
Student Answer: ${userSubjectiveAnswers[i] || "(no answer)"}
`).join("\n")}

Return JSON array:
[
  {
    "questionId": 1,
    "marks": 2,
    "maxMarks": 2,
    "feedback": "Good explanation covering key concepts.",
    "keywordsMatched": ["keyword1"],
    "keywordsMissed": ["keyword2"]
  }
]`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "You are a precise academic grader. Return ONLY valid JSON." },
            { role: "user", content: gradingPrompt },
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
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "[]";
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      const aiGrading = JSON.parse(content);

      subjectiveResults = subjective.map((q: any, i: number) => {
        const grading = aiGrading[i] || { marks: 0, feedback: "Could not grade", keywordsMatched: [], keywordsMissed: q.keywords };
        return {
          questionId: q.id,
          question: q.question,
          userAnswer: userSubjectiveAnswers[i] || "",
          expectedAnswer: q.expectedAnswer,
          marks: Math.min(grading.marks || 0, 2),
          maxMarks: 2,
          feedback: grading.feedback || "",
          keywordsMatched: grading.keywordsMatched || [],
          keywordsMissed: grading.keywordsMissed || [],
        };
      });
    }

    const totalMcqMarks = mcqResults.reduce((s: number, r: any) => s + r.maxMarks, 0);
    const obtainedMcqMarks = mcqResults.reduce((s: number, r: any) => s + r.marks, 0);
    const totalSubMarks = subjectiveResults.reduce((s: number, r: any) => s + r.maxMarks, 0);
    const obtainedSubMarks = subjectiveResults.reduce((s: number, r: any) => s + r.marks, 0);

    const result = {
      mcqResults,
      subjectiveResults,
      totalMarks: totalMcqMarks + totalSubMarks,
      obtainedMarks: obtainedMcqMarks + obtainedSubMarks,
      percentage: Math.round(((obtainedMcqMarks + obtainedSubMarks) / (totalMcqMarks + totalSubMarks)) * 100),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("grade-ai-quiz error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
