import { useState } from "react";
import { Folder, FolderOpen, ChevronDown, ChevronRight, Trash2, Edit2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import EditFolderDialog from "./EditFolderDialog";
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
import MaterialCard from "./MaterialCard";

interface FolderViewProps {
  folderName: string;
  folderColor: string;
  materials: any[];
  getTypeIcon: (type: string) => React.ReactNode;
  onUpdate: () => void;
  onDrop: (folderName: string, materialId: string) => void;
  onDeleteFolder: (folderName: string) => void;
  onEditFolder: (oldName: string, newName: string, color: string) => void;
  onMaterialDragStart: (material: any) => void;
  draggingMaterial: any;
  existingFolders: string[];
  onAddMaterial: (folderName: string) => void;
}

const FolderView = ({
  folderName,
  folderColor,
  materials,
  getTypeIcon,
  onUpdate,
  onDrop,
  onDeleteFolder,
  onEditFolder,
  onMaterialDragStart,
  draggingMaterial,
  existingFolders,
  onAddMaterial,
}: FolderViewProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const materialId = e.dataTransfer.getData("materialId");
    const currentFolder = e.dataTransfer.getData("currentFolder");
    
    if (materialId && currentFolder !== folderName) {
      onDrop(folderName, materialId);
    }
  };

  const handleDeleteFolder = () => {
    if (materials.length === 0) {
      onDeleteFolder(folderName);
      setShowDeleteDialog(false);
    }
  };

  return (
    <>
      <Card
        className={`transition-all border-l-4 ${isDragOver ? 'ring-2 bg-primary/5' : ''}`}
        style={{ 
          borderLeftColor: folderColor,
          ...(isDragOver && { borderColor: folderColor })
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2 flex-1 text-left hover:opacity-80 transition-opacity"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              {isExpanded ? (
                <FolderOpen className="h-5 w-5" style={{ color: folderColor }} />
              ) : (
                <Folder className="h-5 w-5" style={{ color: folderColor }} />
              )}
              <span className="text-lg font-semibold">{folderName}</span>
              <span className="text-sm text-muted-foreground">({materials.length})</span>
            </button>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onAddMaterial(folderName)}
                title="Add material to folder"
              >
                <Plus className="h-4 w-4" />
              </Button>
              {folderName !== "Uncategorized" && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowEditDialog(true)}
                    title="Edit folder"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={materials.length > 0}
                    title={materials.length > 0 ? "Remove all materials first" : "Delete folder"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>
          </div>

          {isExpanded && (
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 mt-4">
              {materials.length === 0 ? (
                <div className="col-span-full text-center py-8 text-muted-foreground text-sm">
                  Drop files here or add materials to this folder
                </div>
              ) : (
                materials.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    onUpdate={onUpdate}
                    getTypeIcon={getTypeIcon}
                    onDragStart={onMaterialDragStart}
                    isDragging={draggingMaterial?.id === material.id}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </Card>

      <EditFolderDialog
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onEditFolder={onEditFolder}
        existingFolders={existingFolders}
        currentFolder={{ name: folderName, color: folderColor }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {materials.length > 0
                ? `Cannot delete "${folderName}" because it contains ${materials.length} material(s). Remove all materials first.`
                : `Are you sure you want to delete the folder "${folderName}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            {materials.length === 0 && (
              <AlertDialogAction onClick={handleDeleteFolder}>Delete</AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FolderView;
