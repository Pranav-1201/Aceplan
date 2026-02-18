import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileEdit } from "lucide-react";

interface EditMaterialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEditMaterial: (newTitle: string) => void;
  currentTitle: string;
}

const EditMaterialDialog = ({ open, onOpenChange, onEditMaterial, currentTitle }: EditMaterialDialogProps) => {
  const [title, setTitle] = useState(currentTitle);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmed = title.trim();
    
    if (!trimmed) {
      setError("Title is required");
      return;
    }
    
    if (trimmed.length > 200) {
      setError("Title is too long");
      return;
    }
    
    onEditMaterial(trimmed);
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5 text-primary" />
            Rename Material
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="materialTitle">Material Title</Label>
            <Input
              id="materialTitle"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              placeholder="Enter new title"
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Rename</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditMaterialDialog;
