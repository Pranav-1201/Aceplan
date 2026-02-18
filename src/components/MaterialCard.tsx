import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash2, Edit2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import EditMaterialDialog from "./EditMaterialDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MaterialCardProps {
  material: any;
  onUpdate: () => void;
  getTypeIcon: (type: string) => React.ReactNode;
  onDragStart?: (material: any) => void;
  isDragging?: boolean;
}

const MaterialCard = ({ material, onUpdate, getTypeIcon, onDragStart, isDragging }: MaterialCardProps) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showContentDialog, setShowContentDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "pdf":
        return "#10b981"; // Green
      case "ppt":
        return "#f97316"; // Orange
      case "notes":
        return "#3b82f6"; // Blue
      case "video":
        return "#ef4444"; // Red
      case "link":
        return "#a855f7"; // Purple
      default:
        return "#6b7280"; // Gray
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("materialId", material.id);
    e.dataTransfer.setData("currentFolder", material.folder || "Uncategorized");
    onDragStart?.(material);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete file from storage if it exists
      if (material.url) {
        await supabase.storage.from('study-materials').remove([material.url]);
      }

      const { error } = await supabase.from("study_materials").delete().eq("id", material.id);

      if (error) throw error;

      toast.success("Material deleted successfully");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to delete material");
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handleViewFile = async () => {
    if (material.url) {
      const { data } = await supabase.storage
        .from('study-materials')
        .createSignedUrl(material.url, 3600);
      
      if (data?.signedUrl) {
        window.open(data.signedUrl, "_blank");
      }
    }
  };

  const handleEditMaterial = async (newTitle: string) => {
    try {
      const { error } = await supabase
        .from("study_materials")
        .update({ title: newTitle })
        .eq("id", material.id);

      if (error) throw error;

      toast.success("Material renamed successfully");
      onUpdate();
    } catch (error: any) {
      toast.error("Failed to rename material");
    }
  };

  return (
    <>
      <Card 
        className={`hover:shadow-[var(--shadow-medium)] transition-all cursor-move ${isDragging ? 'opacity-50' : ''} border-l-4`}
        style={{ borderLeftColor: getTypeColor(material.type) }}
        draggable
        onDragStart={handleDragStart}
      >
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span style={{ color: getTypeColor(material.type) }}>
                  {getTypeIcon(material.type)}
                </span>
                {material.title}
              </CardTitle>
              <CardDescription className="capitalize">{material.type}</CardDescription>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowEditDialog(true)}
                title="Rename"
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {material.content && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowContentDialog(true)}
            >
              View Notes
            </Button>
          )}
          {material.url && (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleViewFile}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View File
            </Button>
          )}
        </CardContent>
      </Card>

      <EditMaterialDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEditMaterial={handleEditMaterial}
        currentTitle={material.title}
      />

      <Dialog open={showContentDialog} onOpenChange={setShowContentDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{material.title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none">
            <pre className="whitespace-pre-wrap font-sans">{material.content}</pre>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Material</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{material.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting}>
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MaterialCard;