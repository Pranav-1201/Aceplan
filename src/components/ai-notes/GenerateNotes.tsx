import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import { marked } from "marked";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Upload,
  ChevronRight,
  FolderOpen,
} from "lucide-react";

interface SubjectWithMaterials {
  id: string;
  name: string;
  color: string | null;
  is_active: boolean;
  materials: { id: string; title: string; content: string | null; type: string }[];
}

const GenerateNotes = ({
  onNoteCreated,
}: {
  onNoteCreated: (id: string) => void;
}) => {
  const [step, setStep] = useState(1);

  // Step 1
  const [sourceType, setSourceType] = useState<"existing" | "text" | "upload">("text");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
  const [pastedText, setPastedText] = useState("");
  const [title, setTitle] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [extractedText, setExtractedText] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [userPrompt, setUserPrompt] = useState("");

  // Step 2
  const [detailLevel, setDetailLevel] = useState("Standard");
  const [style, setStyle] = useState("Exam-ready");
  const [includeTables, setIncludeTables] = useState(true);
  const [includeDiagrams, setIncludeDiagrams] = useState(false);
  const [includeExamples, setIncludeExamples] = useState(true);

  // Step 3
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState("");

  // Subject folders open state
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set());

  const { data: subjectsWithMaterials } = useQuery({
    queryKey: ["subjects-with-materials-for-ai"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return [];

      const { data: subjects } = await supabase
        .from("subjects")
        .select("id, name, color, is_active")
        .order("is_active", { ascending: false })
        .order("name");

      if (!subjects?.length) return [];

      const { data: materials } = await supabase
        .from("study_materials")
        .select("id, title, content, type, subject_id");

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
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleMaterial = (id: string) => {
    setSelectedMaterialIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadedFiles(files);
    setIsExtracting(true);
    setExtractedText("");

    let allText = "";
    for (const file of files) {
      if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        allText += await file.text() + "\n\n";
      } else {
        // For PDF/DOCX/PPT - read as text if possible, otherwise inform user
        try {
          const text = await file.text();
          if (text && text.length > 50) {
            allText += `## ${file.name}\n${text}\n\n`;
          } else {
            allText += `## ${file.name}\n[File content could not be fully extracted. For best results, copy and paste the text content directly.]\n\n`;
          }
        } catch {
          allText += `## ${file.name}\n[File content could not be extracted. Please paste the text content manually.]\n\n`;
        }
      }
    }
    setExtractedText(allText);
    setIsExtracting(false);
  };

  const canProceedStep1 =
    sourceType === "text"
      ? pastedText.trim().length > 0
      : sourceType === "upload"
        ? extractedText.trim().length > 0
        : selectedMaterialIds.length > 0;

  const handleGenerate = async () => {
    let materialContent = "";
    if (sourceType === "text") {
      materialContent = pastedText;
    } else if (sourceType === "upload") {
      materialContent = extractedText;
    } else {
      const allMaterials = subjectsWithMaterials?.flatMap((s) => s.materials) || [];
      const selected = allMaterials.filter((m) => selectedMaterialIds.includes(m.id));
      materialContent = selected
        .map((m) => `## ${m.title}\n${m.content || ""}`)
        .join("\n\n");
    }

    if (!materialContent.trim()) {
      toast.error("No content to generate notes from");
      return;
    }

    setIsGenerating(true);
    setGeneratedContent("");
    setStep(3);

    try {
      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ai-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            materialContent,
            userPrompt: userPrompt.trim() || undefined,
            preferences: {
              detailLevel,
              style,
              includeTables,
              includeDiagrams,
              includeExamples,
            },
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Generation failed" }));
        toast.error(err.error || "Failed to generate notes");
        setIsGenerating(false);
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let streamDone = false;

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              setGeneratedContent(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Save to DB
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const noteTitle =
        title.trim() || `AI Notes - ${new Date().toLocaleDateString()}`;
      const htmlContent = marked.parse(fullContent) as string;

      const { data: note, error } = (await (supabase as any)
        .from("ai_notes")
        .insert({
          user_id: user.id,
          title: noteTitle,
          content: htmlContent,
          source_material_ids: selectedMaterialIds,
          refinement_history: [],
        })
        .select()
        .single()) as { data: any; error: any };

      if (error) throw error;
      toast.success("Notes generated and saved!");
      setTimeout(() => onNoteCreated(note.id), 500);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate notes");
    } finally {
      setIsGenerating(false);
    }
  };

  const activeSubjects = subjectsWithMaterials?.filter((s) => s.is_active) || [];
  const pastSubjects = subjectsWithMaterials?.filter((s) => !s.is_active) || [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= s
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {s}
            </div>
            {s < 3 && (
              <div
                className={`h-0.5 w-8 ${step > s ? "bg-primary" : "bg-muted"}`}
              />
            )}
          </div>
        ))}
        <span className="text-sm text-muted-foreground ml-2">
          {step === 1
            ? "Source Material"
            : step === 2
              ? "Preferences"
              : "Generating"}
        </span>
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Source Material</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Note Title (optional)</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Study Notes"
              />
            </div>

            <div>
              <Label>Custom Instructions (optional)</Label>
              <Textarea
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                placeholder="E.g., Focus on exam-relevant topics, explain with real-world examples, emphasize formulas..."
                rows={3}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={sourceType === "text" ? "default" : "outline"}
                onClick={() => setSourceType("text")}
                size="sm"
              >
                Paste Text
              </Button>
              <Button
                variant={sourceType === "upload" ? "default" : "outline"}
                onClick={() => setSourceType("upload")}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-1" /> Upload File
              </Button>
              <Button
                variant={sourceType === "existing" ? "default" : "outline"}
                onClick={() => setSourceType("existing")}
                size="sm"
              >
                Existing Materials
              </Button>
            </div>

            {sourceType === "text" && (
              <Textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste your study material, lecture notes, or any text content here..."
                rows={10}
              />
            )}

            {sourceType === "upload" && (
              <div className="space-y-3">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Upload text files (.txt, .md) for best results
                  </p>
                  <Input
                    type="file"
                    accept=".txt,.md,.pdf,.docx,.pptx,.doc,.ppt"
                    multiple
                    onChange={handleFileChange}
                    className="max-w-xs mx-auto"
                  />
                </div>
                {isExtracting && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Extracting text...
                  </div>
                )}
                {uploadedFiles.length > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {uploadedFiles.map((f) => f.name).join(", ")}
                  </div>
                )}
                {extractedText && (
                  <Textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    placeholder="Extracted text will appear here. You can edit it before generating."
                    rows={8}
                  />
                )}
              </div>
            )}

            {sourceType === "existing" && (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {activeSubjects.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Active Subjects</p>
                    {activeSubjects.map((subject) => (
                      <SubjectFolder
                        key={subject.id}
                        subject={subject}
                        isOpen={openSubjects.has(subject.id)}
                        onToggle={() => toggleSubject(subject.id)}
                        selectedIds={selectedMaterialIds}
                        onToggleMaterial={toggleMaterial}
                      />
                    ))}
                  </div>
                )}
                {pastSubjects.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mt-4">Past Subjects</p>
                    {pastSubjects.map((subject) => (
                      <SubjectFolder
                        key={subject.id}
                        subject={subject}
                        isOpen={openSubjects.has(subject.id)}
                        onToggle={() => toggleSubject(subject.id)}
                        selectedIds={selectedMaterialIds}
                        onToggleMaterial={toggleMaterial}
                      />
                    ))}
                  </div>
                )}
                {!subjectsWithMaterials?.length && (
                  <p className="text-muted-foreground text-sm">
                    No study materials found. Add some from the Subjects page or
                    use another source option.
                  </p>
                )}
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

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Generation Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Detail Level</Label>
                <Select value={detailLevel} onValueChange={setDetailLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Brief">Brief (~4-5K chars)</SelectItem>
                    <SelectItem value="Standard">Standard (~7-8K chars)</SelectItem>
                    <SelectItem value="Comprehensive">Comprehensive (~10-12K chars)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Style</Label>
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Exam-ready">Exam-ready</SelectItem>
                    <SelectItem value="Simplified">Simplified</SelectItem>
                    <SelectItem value="Conceptual">Conceptual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Include Tables</Label>
                <Switch
                  checked={includeTables}
                  onCheckedChange={setIncludeTables}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Include Diagram Placeholders</Label>
                <Switch
                  checked={includeDiagrams}
                  onCheckedChange={setIncludeDiagrams}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Include Examples</Label>
                <Switch
                  checked={includeExamples}
                  onCheckedChange={setIncludeExamples}
                />
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-1" /> Generate Notes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isGenerating && <Loader2 className="h-5 w-5 animate-spin" />}
              {isGenerating ? "Generating Notes..." : "Notes Generated!"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className="tiptap-preview max-h-[500px] overflow-y-auto p-4 border rounded-lg bg-muted/30"
              dangerouslySetInnerHTML={{
                __html: marked.parse(generatedContent) as string,
              }}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

function SubjectFolder({
  subject,
  isOpen,
  onToggle,
  selectedIds,
  onToggleMaterial,
}: {
  subject: SubjectWithMaterials;
  isOpen: boolean;
  onToggle: () => void;
  selectedIds: string[];
  onToggleMaterial: (id: string) => void;
}) {
  const selectedCount = subject.materials.filter((m) =>
    selectedIds.includes(m.id)
  ).length;

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <CollapsibleTrigger className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted/50 text-left">
        <ChevronRight
          className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`}
        />
        <FolderOpen
          className="h-4 w-4 shrink-0"
          style={{ color: subject.color || undefined }}
        />
        <span className="font-medium text-sm flex-1">{subject.name}</span>
        <span className="text-xs text-muted-foreground">
          {selectedCount > 0 && `${selectedCount}/`}{subject.materials.length}
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent className="ml-6 space-y-1 mt-1">
        {subject.materials.map((m) => (
          <label
            key={m.id}
            className="flex items-center gap-3 p-2 border rounded-md cursor-pointer hover:bg-muted/50"
          >
            <Checkbox
              checked={selectedIds.includes(m.id)}
              onCheckedChange={() => onToggleMaterial(m.id)}
            />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{m.title}</p>
              <p className="text-xs text-muted-foreground">{m.type}</p>
            </div>
          </label>
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

export default GenerateNotes;
