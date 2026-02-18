import { useState, useEffect, useRef, useCallback } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import TurndownService from "turndown";
import {
  ArrowLeft,
  Bold,
  Italic,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Undo,
  Redo,
  Highlighter,
  Download,
  FileText,
  FileDown,
  Sparkles,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import RefinementDialog from "./RefinementDialog";

interface AiNote {
  id: string;
  user_id: string;
  title: string;
  content: string;
  source_material_ids: string[];
  refinement_history: any[];
  created_at: string;
  updated_at: string;
}

const NoteEditor = ({
  noteId,
  onBack,
}: {
  noteId: string;
  onBack: () => void;
}) => {
  const [note, setNote] = useState<AiNote | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showRefinement, setShowRefinement] = useState(false);
  const [title, setTitle] = useState("");
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const initialLoadRef = useRef(true);

  useEffect(() => {
    const fetchNote = async () => {
      const { data, error } = (await (supabase as any)
        .from("ai_notes")
        .select("*")
        .eq("id", noteId)
        .single()) as { data: AiNote | null; error: any };
      if (error || !data) {
        toast.error("Failed to load note");
        onBack();
        return;
      }
      setNote(data);
      setTitle(data.title);
      setLoading(false);
    };
    fetchNote();
  }, [noteId, onBack]);

  const debouncedSave = useCallback(
    (html: string) => {
      if (initialLoadRef.current) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(async () => {
        setSaving(true);
        await (supabase as any)
          .from("ai_notes")
          .update({ content: html })
          .eq("id", noteId);
        setSaving(false);
      }, 2000);
    },
    [noteId]
  );

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: false }),
      Image,
    ],
    content: "",
    onUpdate: ({ editor }) => {
      debouncedSave(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && note?.content && initialLoadRef.current) {
      editor.commands.setContent(note.content);
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 200);
    }
  }, [editor, note]);

  const saveTitle = async () => {
    if (!title.trim()) return;
    await (supabase as any)
      .from("ai_notes")
      .update({ title: title.trim() })
      .eq("id", noteId);
    toast.success("Title updated");
  };

  const handleRefined = (newHtml: string) => {
    if (editor) {
      initialLoadRef.current = true;
      editor.commands.setContent(newHtml);
      setTimeout(() => {
        initialLoadRef.current = false;
      }, 200);
      (supabase as any)
        .from("ai_notes")
        .update({ content: newHtml })
        .eq("id", noteId);
      toast.success("Notes refined successfully");
    }
    setShowRefinement(false);
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    const td = new TurndownService();
    const md = td.turndown(editor?.getHTML() || "");
    downloadFile(md, `${note?.title || "notes"}.md`, "text/markdown");
  };

  const downloadPDF = () => {
    const content = editor?.getHTML() || "";
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(
        `<!DOCTYPE html><html><head><title>${note?.title}</title><style>body{font-family:system-ui,sans-serif;padding:2rem;max-width:800px;margin:0 auto;line-height:1.6;}h1,h2,h3{margin-top:1.5em;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:8px;}mark{background:#fef08a;}ul,ol{padding-left:1.5em;}</style></head><body><h1>${note?.title}</h1>${content}</body></html>`
      );
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
  };

  const downloadDocx = () => {
    const content = editor?.getHTML() || "";
    const docContent = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'><head><meta charset='utf-8'><style>body{font-family:Calibri,sans-serif;line-height:1.6;}h1,h2,h3{color:#333;}table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ccc;padding:8px;}mark{background:#fef08a;}</style></head><body><h1>${note?.title}</h1>${content}</body></html>`;
    downloadFile(
      docContent,
      `${note?.title || "notes"}.doc`,
      "application/msword"
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    active,
    disabled,
    children,
  }: {
    onClick: () => void;
    active?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="icon"
      className={`h-8 w-8 ${active ? "bg-muted" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );

  return (
    <div className="container mx-auto px-4 py-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          className="text-xl font-bold bg-transparent border-none shadow-none flex-1 min-w-[200px]"
        />
        <div className="flex items-center gap-2">
          {saving && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRefinement(true)}
          >
            <Sparkles className="h-4 w-4 mr-1" /> Refine with AI
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" /> Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={downloadPDF}>
                <FileText className="h-4 w-4 mr-2" /> PDF (Print)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadDocx}>
                <FileDown className="h-4 w-4 mr-2" /> DOCX
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadMarkdown}>
                <FileText className="h-4 w-4 mr-2" /> Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Toolbar */}
      {editor && (
        <div className="flex flex-wrap gap-1 p-2 border rounded-lg bg-muted/50">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive("bold")}
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive("italic")}
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive("strike")}
          >
            <Strikethrough className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            active={editor.isActive("highlight")}
          >
            <Highlighter className="h-4 w-4" />
          </ToolbarButton>
          <div className="w-px h-8 bg-border mx-1" />
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 1 }).run()
            }
            active={editor.isActive("heading", { level: 1 })}
          >
            <Heading1 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 2 }).run()
            }
            active={editor.isActive("heading", { level: 2 })}
          >
            <Heading2 className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() =>
              editor.chain().focus().toggleHeading({ level: 3 }).run()
            }
            active={editor.isActive("heading", { level: 3 })}
          >
            <Heading3 className="h-4 w-4" />
          </ToolbarButton>
          <div className="w-px h-8 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive("bulletList")}
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive("orderedList")}
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive("blockquote")}
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive("codeBlock")}
          >
            <Code className="h-4 w-4" />
          </ToolbarButton>
          <div className="w-px h-8 bg-border mx-1" />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      )}

      {/* Editor */}
      <div className="border rounded-lg min-h-[500px] bg-card">
        <EditorContent editor={editor} />
      </div>

      <RefinementDialog
        open={showRefinement}
        onOpenChange={setShowRefinement}
        currentContent={editor?.getHTML() || ""}
        noteId={noteId}
        onRefined={handleRefined}
      />
    </div>
  );
};

export default NoteEditor;
