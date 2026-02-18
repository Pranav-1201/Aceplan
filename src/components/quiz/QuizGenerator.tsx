import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  ChevronRight,
  FolderOpen,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Send,
} from "lucide-react";

interface SubjectWithMaterials {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  materials: { id: string; title: string; content: string | null; type: string }[];
}

interface AINote {
  id: string;
  title: string;
  content: string | null;
}

interface MCQ {
  id: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

interface SubjectiveQ {
  id: number;
  question: string;
  expectedAnswer: string;
  keywords: string[];
  maxMarks: number;
}

interface GradingResult {
  mcqResults: any[];
  subjectiveResults: any[];
  totalMarks: number;
  obtainedMarks: number;
  percentage: number;
}

const QuizGenerator = ({ onQuizSaved }: { onQuizSaved?: () => void }) => {
  const [step, setStep] = useState(1);
  
  // Step 1 - Source
  const [sourceType, setSourceType] = useState<"notes" | "materials" | "text">("text");
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());

  // Step 2 - Level
  const [quizLevel, setQuizLevel] = useState<"quick" | "detailed" | "comprehensive">("quick");

  // Step 3 - Quiz
  const [isGenerating, setIsGenerating] = useState(false);
  const [mcqs, setMcqs] = useState<MCQ[]>([]);
  const [subjective, setSubjective] = useState<SubjectiveQ[]>([]);
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({});
  const [subjectiveAnswers, setSubjectiveAnswers] = useState<Record<number, string>>({});

  // Step 4 - Results
  const [isGrading, setIsGrading] = useState(false);
  const [results, setResults] = useState<GradingResult | null>(null);

  const { data: aiNotes } = useQuery({
    queryKey: ["ai-notes-for-quiz"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data } = await supabase.from("ai_notes").select("id, title, content").order("created_at", { ascending: false });
      return (data || []) as AINote[];
    },
  });

  const { data: subjectsWithMaterials } = useQuery({
    queryKey: ["subjects-with-materials-for-quiz"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data: subjects } = await supabase.from("subjects").select("id, name, color, is_active").order("is_active", { ascending: false }).order("name");
      if (!subjects?.length) return [];
      const { data: materials } = await supabase.from("study_materials").select("id, title, content, type, subject_id");
      const result: SubjectWithMaterials[] = subjects.map((s) => ({
        ...s,
        materials: (materials || []).filter((m) => m.subject_id === s.id),
      }));
      return result.filter((s) => s.materials.length > 0);
    },
  });

  const toggleSubject = (id: string) => {
    setOpenSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const canProceedStep1 =
    sourceType === "text" ? pastedText.trim().length > 0
    : sourceType === "notes" ? selectedNoteIds.length > 0
    : selectedMaterialIds.length > 0;

  const getMaterialContent = (): string => {
    if (sourceType === "text") return pastedText;
    if (sourceType === "notes") {
      return (aiNotes || [])
        .filter((n) => selectedNoteIds.includes(n.id))
        .map((n) => `## ${n.title}\n${n.content || ""}`)
        .join("\n\n");
    }
    const allMaterials = subjectsWithMaterials?.flatMap((s) => s.materials) || [];
    return allMaterials
      .filter((m) => selectedMaterialIds.includes(m.id))
      .map((m) => `## ${m.title}\n${m.content || ""}`)
      .join("\n\n");
  };

  const handleGenerate = async () => {
    const content = getMaterialContent();
    if (!content.trim()) { toast.error("No content to generate quiz from"); return; }

    setIsGenerating(true);
    setStep(3);
    setMcqAnswers({});
    setSubjectiveAnswers({});
    setResults(null);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ materialContent: content, quizLevel }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast.error(err.error || "Failed to generate quiz");
        setStep(2);
        setIsGenerating(false);
        return;
      }

      const quiz = await resp.json();
      setMcqs(quiz.mcqs || []);
      setSubjective(quiz.subjective || []);
      toast.success("Quiz generated!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate quiz");
      setStep(2);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async () => {
    const unansweredMcqs = mcqs.filter((_, i) => !mcqAnswers[i]);
    if (unansweredMcqs.length > 0) {
      toast.error(`Please answer all MCQ questions (${unansweredMcqs.length} remaining)`);
      return;
    }

    setIsGrading(true);
    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/grade-ai-quiz`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            mcqs,
            subjective,
            userMcqAnswers: mcqs.map((_, i) => mcqAnswers[i] || ""),
            userSubjectiveAnswers: subjective.map((_, i) => subjectiveAnswers[i] || ""),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Grading failed" }));
        toast.error(err.error || "Failed to grade quiz");
        setIsGrading(false);
        return;
      }

      const gradingResult = await resp.json();
      setResults(gradingResult);
      setStep(4);

      // Save to DB
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from("quiz_attempts").insert({
          user_id: user.id,
          quiz_level: quizLevel,
          source_material_reference: sourceType,
          questions_json: { mcqs, subjective },
          user_answers_json: { mcqAnswers, subjectiveAnswers },
          grading_result_json: gradingResult,
          total_marks: gradingResult.totalMarks,
          obtained_marks: gradingResult.obtainedMarks,
        });
        onQuizSaved?.();
      }
      toast.success("Quiz graded!");
    } catch (e) {
      console.error(e);
      toast.error("Failed to grade quiz");
    } finally {
      setIsGrading(false);
    }
  };

  const resetQuiz = () => {
    setStep(1);
    setMcqs([]);
    setSubjective([]);
    setMcqAnswers({});
    setSubjectiveAnswers({});
    setResults(null);
    setPastedText("");
    setSelectedNoteIds([]);
    setSelectedMaterialIds([]);
  };

  const activeSubjects = subjectsWithMaterials?.filter((s) => s.is_active) || [];
  const pastSubjects = subjectsWithMaterials?.filter((s) => !s.is_active) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {s}
            </div>
            {s < 4 && <div className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {step === 1 ? "Source" : step === 2 ? "Level" : step === 3 ? "Quiz" : "Results"}
        </span>
      </div>

      {/* STEP 1: Source Selection */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Source Material</CardTitle>
            <CardDescription>Choose what content to generate quiz questions from</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2 flex-wrap">
              <Button variant={sourceType === "text" ? "default" : "outline"} onClick={() => setSourceType("text")} size="sm">Paste Text</Button>
              <Button variant={sourceType === "notes" ? "default" : "outline"} onClick={() => setSourceType("notes")} size="sm">AI Notes</Button>
              <Button variant={sourceType === "materials" ? "default" : "outline"} onClick={() => setSourceType("materials")} size="sm">Study Materials</Button>
            </div>

            {sourceType === "text" && (
              <Textarea value={pastedText} onChange={(e) => setPastedText(e.target.value)} placeholder="Paste your study content here..." rows={10} />
            )}

            {sourceType === "notes" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {(aiNotes || []).length === 0 && <p className="text-sm text-muted-foreground">No AI notes found. Generate some first.</p>}
                {(aiNotes || []).map((note) => (
                  <label key={note.id} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-accent/50 transition-colors">
                    <Checkbox checked={selectedNoteIds.includes(note.id)} onCheckedChange={() => {
                      setSelectedNoteIds((prev) => prev.includes(note.id) ? prev.filter((x) => x !== note.id) : [...prev, note.id]);
                    }} />
                    <span className="text-sm font-medium">{note.title}</span>
                  </label>
                ))}
              </div>
            )}

            {sourceType === "materials" && (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {activeSubjects.map((subject) => (
                  <Collapsible key={subject.id} open={openSubjects.has(subject.id)} onOpenChange={() => toggleSubject(subject.id)}>
                    <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent/50 transition-colors">
                      <ChevronRight className={`h-4 w-4 transition-transform ${openSubjects.has(subject.id) ? "rotate-90" : ""}`} />
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color || "#3B82F6" }} />
                      <span className="text-sm font-medium">{subject.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{subject.materials.length} items</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-8 space-y-1 mt-1">
                      {subject.materials.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/30 cursor-pointer">
                          <Checkbox checked={selectedMaterialIds.includes(m.id)} onCheckedChange={() => {
                            setSelectedMaterialIds((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]);
                          }} />
                          <FolderOpen className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">{m.title}</span>
                        </label>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                {pastSubjects.length > 0 && (
                  <>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mt-4">Past Subjects</p>
                    {pastSubjects.map((subject) => (
                      <Collapsible key={subject.id} open={openSubjects.has(subject.id)} onOpenChange={() => toggleSubject(subject.id)}>
                        <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent/50">
                          <ChevronRight className={`h-4 w-4 transition-transform ${openSubjects.has(subject.id) ? "rotate-90" : ""}`} />
                          <div className="h-3 w-3 rounded-full opacity-50" style={{ backgroundColor: subject.color || "#3B82F6" }} />
                          <span className="text-sm font-medium opacity-70">{subject.name}</span>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-8 space-y-1 mt-1">
                          {subject.materials.map((m) => (
                            <label key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-accent/30 cursor-pointer">
                              <Checkbox checked={selectedMaterialIds.includes(m.id)} onCheckedChange={() => {
                                setSelectedMaterialIds((prev) => prev.includes(m.id) ? prev.filter((x) => x !== m.id) : [...prev, m.id]);
                              }} />
                              <span className="text-sm">{m.title}</span>
                            </label>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                  </>
                )}
                {!subjectsWithMaterials?.length && <p className="text-sm text-muted-foreground">No study materials found.</p>}
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!canProceedStep1}>
                Next <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2: Level Selection */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Quiz Level</CardTitle>
            <CardDescription>Choose the difficulty and length of your quiz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={quizLevel} onValueChange={(v) => setQuizLevel(v as any)} className="space-y-3">
              {[
                { value: "quick", label: "🟢 Quick", desc: "10 MCQ questions • Fast review" },
                { value: "detailed", label: "🟡 Detailed", desc: "15 MCQs + 5 Subjective • Thorough test" },
                { value: "comprehensive", label: "🔴 Comprehensive", desc: "20 MCQs + 10 Subjective • Full exam" },
              ].map((opt) => (
                <label key={opt.value} className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-colors ${
                  quizLevel === opt.value ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                }`}>
                  <RadioGroupItem value={opt.value} />
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleGenerate}>
                Generate Quiz <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3: Take Quiz */}
      {step === 3 && (
        <>
          {isGenerating ? (
            <Card>
              <CardContent className="py-16 text-center">
                <Loader2 className="h-10 w-10 animate-spin mx-auto mb-4 text-primary" />
                <p className="text-lg font-medium">Generating your quiz...</p>
                <p className="text-sm text-muted-foreground mt-1">This may take a moment</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* MCQs */}
              {mcqs.map((q, i) => (
                <Card key={`mcq-${i}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Q{i + 1}. {q.question}</CardTitle>
                    <CardDescription>MCQ • 1 mark</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={mcqAnswers[i] || ""} onValueChange={(v) => setMcqAnswers((prev) => ({ ...prev, [i]: v }))}>
                      {q.options.map((opt, oi) => {
                        const letter = String.fromCharCode(65 + oi);
                        return (
                          <label key={oi} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            mcqAnswers[i] === letter ? "border-primary bg-primary/5" : "hover:bg-accent/50"
                          }`}>
                            <RadioGroupItem value={letter} />
                            <span className="text-sm">{opt}</span>
                          </label>
                        );
                      })}
                    </RadioGroup>
                  </CardContent>
                </Card>
              ))}

              {/* Subjective */}
              {subjective.map((q, i) => (
                <Card key={`sub-${i}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Q{mcqs.length + i + 1}. {q.question}</CardTitle>
                    <CardDescription>Subjective • 2 marks</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea
                      value={subjectiveAnswers[i] || ""}
                      onChange={(e) => setSubjectiveAnswers((prev) => ({ ...prev, [i]: e.target.value }))}
                      placeholder="Type your answer here..."
                      rows={4}
                    />
                  </CardContent>
                </Card>
              ))}

              {mcqs.length > 0 && (
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {Object.keys(mcqAnswers).length}/{mcqs.length} MCQs answered
                    {subjective.length > 0 && ` • ${Object.keys(subjectiveAnswers).filter((k) => subjectiveAnswers[Number(k)]?.trim()).length}/${subjective.length} Subjective answered`}
                  </p>
                  <Button onClick={handleSubmit} disabled={isGrading}>
                    {isGrading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Grading...</> : <><Send className="h-4 w-4 mr-2" /> Submit Quiz</>}
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* STEP 4: Results */}
      {step === 4 && results && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Quiz Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <div className="text-4xl font-bold">{results.obtainedMarks}/{results.totalMarks}</div>
                <Progress value={results.percentage} className="h-3" />
                <p className="text-lg font-medium">{results.percentage}%</p>
                <p className="text-sm text-muted-foreground">
                  {results.percentage >= 80 ? "Excellent! 🎉" : results.percentage >= 60 ? "Good job! 👍" : results.percentage >= 40 ? "Keep practicing! 💪" : "Review the material and try again 📚"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* MCQ Results */}
          {results.mcqResults.map((r: any, i: number) => (
            <Card key={`mcq-r-${i}`} className={r.isCorrect ? "border-green-500/30" : "border-red-500/30"}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {r.isCorrect ? <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
                  <div>
                    <CardTitle className="text-base">Q{i + 1}. {r.question}</CardTitle>
                    <CardDescription>{r.marks}/{r.maxMarks} mark</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>Your answer: <span className={r.isCorrect ? "text-green-600 font-medium" : "text-red-600 font-medium"}>{r.userAnswer || "Not answered"}</span></p>
                {!r.isCorrect && <p>Correct answer: <span className="text-green-600 font-medium">{r.correctAnswer}</span></p>}
                {r.explanation && <p className="text-muted-foreground mt-2">{r.explanation}</p>}
              </CardContent>
            </Card>
          ))}

          {/* Subjective Results */}
          {results.subjectiveResults.map((r: any, i: number) => (
            <Card key={`sub-r-${i}`} className={r.marks === 2 ? "border-green-500/30" : r.marks === 1 ? "border-yellow-500/30" : "border-red-500/30"}>
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {r.marks === 2 ? <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" /> : r.marks === 1 ? <MinusCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" /> : <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
                  <div>
                    <CardTitle className="text-base">Q{results.mcqResults.length + i + 1}. {r.question}</CardTitle>
                    <CardDescription>{r.marks}/{r.maxMarks} marks</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <p><strong>Your answer:</strong> {r.userAnswer || "Not answered"}</p>
                <p><strong>Expected:</strong> {r.expectedAnswer}</p>
                {r.feedback && <p className="text-muted-foreground">{r.feedback}</p>}
                {r.keywordsMatched?.length > 0 && (
                  <p className="text-green-600 text-xs">✓ Keywords matched: {r.keywordsMatched.join(", ")}</p>
                )}
                {r.keywordsMissed?.length > 0 && (
                  <p className="text-red-600 text-xs">✗ Keywords missed: {r.keywordsMissed.join(", ")}</p>
                )}
              </CardContent>
            </Card>
          ))}

          <div className="flex justify-center">
            <Button onClick={resetQuiz}>Take Another Quiz</Button>
          </div>
        </>
      )}
    </div>
  );
};

export default QuizGenerator;
