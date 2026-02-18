import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { marked } from "marked";
import TurndownService from "turndown";
import { supabase } from "@/integrations/supabase/client";

interface RefinementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentContent: string;
  noteId: string;
  onRefined: (newHtmlContent: string) => void;
}

const RefinementDialog = ({
  open,
  onOpenChange,
  currentContent,
  noteId,
  onRefined,
}: RefinementDialogProps) => {
  const [instruction, setInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [preview, setPreview] = useState("");

  const quickActions = [
    "Make simpler",
    "Add more examples",
    "Make more exam-focused",
    "Add more detail",
    "Simplify language",
    "Add summary tables",
  ];

  const handleRefine = async () => {
    if (!instruction.trim()) {
      toast.error("Please enter a refinement instruction");
      return;
    }

    setIsRefining(true);
    setPreview("");

    try {
      const td = new TurndownService();
      const markdownContent = td.turndown(currentContent);

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refine-ai-notes`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            currentContent: markdownContent,
            instruction: instruction.trim(),
          }),
        }
      );

      if (!resp.ok) {
        const err = await resp
          .json()
          .catch(() => ({ error: "Refinement failed" }));
        toast.error(err.error || "Refinement failed");
        setIsRefining(false);
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
              setPreview(fullContent);
            }
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }

      // Store previous version in refinement_history
      const { data: noteData } = (await (supabase as any)
        .from("ai_notes")
        .select("refinement_history, content")
        .eq("id", noteId)
        .single()) as { data: any; error: any };

      const history = noteData?.refinement_history || [];
      history.push({
        content: noteData?.content,
        instruction: instruction.trim(),
        timestamp: new Date().toISOString(),
      });

      await (supabase as any)
        .from("ai_notes")
        .update({ refinement_history: history })
        .eq("id", noteId);

      const htmlContent = marked.parse(fullContent) as string;
      onRefined(htmlContent);
      setInstruction("");
      setPreview("");
    } catch (e) {
      console.error(e);
      toast.error("Refinement failed");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Refine with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Button
                key={action}
                variant="outline"
                size="sm"
                onClick={() => setInstruction(action)}
                disabled={isRefining}
              >
                {action}
              </Button>
            ))}
          </div>
          <Textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Enter your refinement instruction..."
            rows={3}
            disabled={isRefining}
          />
          {preview && (
            <div className="max-h-48 overflow-y-auto p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
              {preview}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isRefining}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRefine}
            disabled={isRefining || !instruction.trim()}
          >
            {isRefining ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Refining...
              </>
            ) : (
              "Refine"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RefinementDialog;
