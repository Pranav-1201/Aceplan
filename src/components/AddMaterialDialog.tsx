import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";

const materialSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  type: z.enum(["pdf", "notes", "video", "link", "ppt", "other"]),
  content: z.string().max(5000, "Content too long").optional(),
  folder: z.string().max(100, "Folder name too long").optional(),
});

interface AddMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  onSuccess: () => void;
  existingFolders?: string[];
  selectedFolder?: string;
}

const AddMaterialDialog = ({ open, onOpenChange, subjectId, onSuccess, existingFolders = [], selectedFolder = "" }: AddMaterialDialogProps) => {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("notes");
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [folder, setFolder] = useState(selectedFolder || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedFolder) {
      setFolder(selectedFolder);
    }
  }, [selectedFolder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = materialSchema.parse({
        title: title.trim(),
        type,
        content: content.trim() || undefined,
        folder: folder.trim() || undefined,
      });

      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // If multiple files, create separate materials for each
      if (files.length > 0) {
        const uploadPromises = files.map(async (file, index) => {
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('study-materials')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          return supabase.from("study_materials").insert({
            user_id: user.id,
            subject_id: subjectId,
            title: files.length > 1 ? `${validated.title} - ${file.name}` : validated.title,
            type: validated.type,
            content: validated.content || null,
            url: fileName,
            folder: validated.folder || null,
          });
        });

        const results = await Promise.all(uploadPromises);
        const failed = results.filter(r => r.error);
        
        if (failed.length > 0) throw new Error(`${failed.length} file(s) failed to upload`);
        
        toast.success(`${files.length} material(s) added successfully!`);
      } else {
        // No files, just create a text material
        const { error } = await supabase.from("study_materials").insert({
          user_id: user.id,
          subject_id: subjectId,
          title: validated.title,
          type: validated.type,
          content: validated.content || null,
          url: null,
          folder: validated.folder || null,
        });

        if (error) throw error;
        toast.success("Material added successfully!");
      }

      setTitle("");
      setType("notes");
      setContent("");
      setFiles([]);
      setFolder("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error.message || "Failed to add material");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Study Material</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 justify-end pb-4 border-b">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="material-form" disabled={loading}>
            {loading ? "Adding..." : "Add Material"}
          </Button>
        </div>

        <form id="material-form" onSubmit={handleSubmit} className="space-y-4 pb-2">
          <div className="space-y-2">
            <Label htmlFor="material-title">Title</Label>
            <Input
              id="material-title"
              placeholder="e.g., Chapter 1 Notes"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-type">Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger id="material-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="notes">Notes</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="ppt">PPT (Presentation)</SelectItem>
                <SelectItem value="video">Video</SelectItem>
                <SelectItem value="link">Link</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-folder">Folder</Label>
            <Select value={folder} onValueChange={setFolder}>
              <SelectTrigger id="material-folder">
                <SelectValue placeholder="Select or create folder" />
              </SelectTrigger>
              <SelectContent>
                {existingFolders.length === 0 && (
                  <SelectItem value="Uncategorized">Uncategorized</SelectItem>
                )}
                {existingFolders.map((folderName) => (
                  <SelectItem key={folderName} value={folderName}>
                    {folderName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Create new folders from the main view
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-file">Attach Files (Optional - Multiple)</Label>
            <Input
              id="material-file"
              type="file"
              multiple
              onChange={(e) => setFiles(Array.from(e.target.files || []))}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.mp4,.mp3"
            />
            {files.length > 0 && (
              <div className="text-sm text-muted-foreground grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 max-h-32 overflow-y-auto p-2 border rounded-md">
                {files.map((file, idx) => (
                  <p key={idx} className="truncate" title={`${file.name} (${(file.size / 1024).toFixed(2)} KB)`}>
                    {file.name} ({(file.size / 1024).toFixed(2)} KB)
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="material-content">Content / Notes (Optional)</Label>
            <Textarea
              id="material-content"
              placeholder="Add your notes or description here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>

        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMaterialDialog;
