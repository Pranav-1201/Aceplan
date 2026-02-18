import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, FileText, Link as LinkIcon, Video, FileType, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import AddMaterialDialog from "@/components/AddMaterialDialog";
import CreateFolderDialog from "@/components/CreateFolderDialog";
import FolderView from "@/components/FolderView";
import MaterialCard from "@/components/MaterialCard";

const SubjectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [subject, setSubject] = useState<any>(null);
  const [materials, setMaterials] = useState<any[]>([]);
  const [foldersList, setFoldersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [draggingMaterial, setDraggingMaterial] = useState<any>(null);

  useEffect(() => {
    fetchSubjectAndMaterials();
  }, [id]);

  const fetchSubjectAndMaterials = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const [subjectRes, materialsRes, foldersRes] = await Promise.all([
        supabase.from("subjects").select("*").eq("id", id).single(),
        supabase.from("study_materials").select("*").eq("subject_id", id).order("created_at", { ascending: false }),
        supabase.from("folders").select("*").eq("subject_id", id).eq("user_id", user.id),
      ]);

      if (subjectRes.error) throw subjectRes.error;
      if (materialsRes.error) throw materialsRes.error;
      if (foldersRes.error) throw foldersRes.error;

      setSubject(subjectRes.data);
      setMaterials(materialsRes.data || []);
      setFoldersList(foldersRes.data || []);
    } catch (error: any) {
      toast.error("Failed to load subject details");
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf":
        return <FileType className="h-4 w-4" />;
      case "ppt":
        return <FileType className="h-4 w-4" />;
      case "video":
        return <Video className="h-4 w-4" />;
      case "link":
        return <LinkIcon className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  // Get folder color - check folders table first, use default if not found
  const getFolderColor = (folderName: string): string => {
    const folder = foldersList.find(f => f.name === folderName);
    return folder?.color || "#6366f1";
  };

  // Get all unique folder names from both sources (excluding materials without folders)
  const allFolderNames = Array.from(
    new Set([
      ...foldersList.map(f => f.name),
      ...materials.map(m => m.folder).filter(f => f)
    ])
  ).sort((a, b) => a.localeCompare(b));

  // Separate materials into those with folders and those without
  const materialsWithFolders = materials.filter(m => m.folder);
  const materialsWithoutFolders = materials.filter(m => !m.folder);

  const folderMaterials = materialsWithFolders.reduce((acc: Record<string, any[]>, material) => {
    const folder = material.folder!;
    if (!acc[folder]) acc[folder] = [];
    acc[folder].push(material);
    return acc;
  }, {});

  const handleCreateFolder = async (folderName: string, color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("folders").insert({
        user_id: user.id,
        subject_id: id!,
        name: folderName,
        color: color,
      });

      if (error) throw error;

      toast.success(`Folder "${folderName}" created!`);
      await fetchSubjectAndMaterials();
      setSelectedFolder(folderName);
      setShowAddDialog(true);
    } catch (error: any) {
      toast.error("Failed to create folder");
      console.error("Create folder error:", error);
    }
  };

  const handleEditFolder = async (oldName: string, newName: string, color: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if folder exists in folders table
      const existingFolder = foldersList.find(f => f.name === oldName);

      if (existingFolder) {
        // Update existing folder
        const { error: folderError } = await supabase
          .from("folders")
          .update({ name: newName, color: color })
          .eq("id", existingFolder.id);

        if (folderError) throw folderError;
      } else {
        // Create new folder entry if it doesn't exist (for old materials)
        const { error: createError } = await supabase
          .from("folders")
          .insert({
            user_id: user.id,
            subject_id: id!,
            name: newName,
            color: color,
          });

        if (createError) throw createError;
      }

      // Update materials with the old folder name to use new name
      if (oldName !== newName) {
        const { error: materialsError } = await supabase
          .from("study_materials")
          .update({ folder: newName })
          .eq("user_id", user.id)
          .eq("subject_id", id!)
          .eq("folder", oldName);

        if (materialsError) throw materialsError;
      }

      toast.success(`Folder updated successfully`);
      await fetchSubjectAndMaterials();
    } catch (error: any) {
      toast.error("Failed to update folder");
      console.error("Edit folder error:", error);
    }
  };

  const handleMoveMaterial = async (targetFolder: string, materialId: string) => {
    try {
      const { error } = await supabase
        .from("study_materials")
        .update({ folder: targetFolder })
        .eq("id", materialId);

      if (error) throw error;

      toast.success(`Material moved to ${targetFolder}`);
      fetchSubjectAndMaterials();
    } catch (error: any) {
      toast.error("Failed to move material");
    }
  };

  const handleDeleteFolder = async (folderName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const folder = foldersList.find(f => f.name === folderName);
      if (!folder) {
        toast.error("Folder not found");
        return;
      }

      const { error } = await supabase
        .from("folders")
        .delete()
        .eq("id", folder.id);

      if (error) throw error;

      toast.success(`Folder "${folderName}" deleted`);
      await fetchSubjectAndMaterials();
    } catch (error: any) {
      toast.error("Failed to delete folder");
      console.error("Delete folder error:", error);
    }
  };

  const handleAddMaterialClick = (folderName?: string) => {
    setSelectedFolder(folderName || "");
    setShowAddDialog(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Back to Dashboard</span>
            <span className="sm:hidden">Back</span>
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8">
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3 mb-2">
            <div
              className="w-5 h-5 md:w-6 md:h-6 rounded-full"
              style={{ backgroundColor: subject?.color }}
            />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold break-words">{subject?.name}</h1>
          </div>
          {subject?.exam_date && (
            <p className="text-sm md:text-base text-muted-foreground">
              Exam: {new Date(subject.exam_date).toLocaleDateString()}
            </p>
          )}
        </div>

        <div className="sticky top-0 z-10 bg-background pt-4 pb-4 md:pb-6 -mx-4 px-4 sm:-mx-6 sm:px-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <h2 className="text-xl sm:text-2xl font-semibold flex-shrink-0">Study Materials</h2>
            <div className="flex gap-2 flex-shrink-0">
              <Button onClick={() => setShowCreateFolderDialog(true)} variant="outline" className="flex-1 sm:flex-initial whitespace-nowrap">
                <FolderPlus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">New Folder</span>
                <span className="xs:hidden">Folder</span>
              </Button>
              <Button onClick={() => handleAddMaterialClick()} className="flex-1 sm:flex-initial whitespace-nowrap">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden xs:inline">Add Material</span>
                <span className="xs:hidden">Add</span>
              </Button>
            </div>
          </div>
        </div>

        {materials.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8 md:py-12 px-4">
              <FileText className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg md:text-xl font-semibold mb-2">No materials yet</h3>
              <p className="text-sm md:text-base text-muted-foreground mb-4">
                Create folders and add your notes, PDFs, videos, and links to organize your study materials
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <Button onClick={() => setShowCreateFolderDialog(true)} variant="outline" className="w-full sm:w-auto">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create Folder
                </Button>
                <Button onClick={() => handleAddMaterialClick()} className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Material
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Materials without folders */}
            {materialsWithoutFolders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-6">
                {materialsWithoutFolders.map((material) => (
                  <MaterialCard
                    key={material.id}
                    material={material}
                    getTypeIcon={getTypeIcon}
                    onUpdate={fetchSubjectAndMaterials}
                    onDragStart={setDraggingMaterial}
                  />
                ))}
              </div>
            )}

            {/* Folders with materials */}
            {allFolderNames.map((folderName) => (
              <FolderView
                key={folderName}
                folderName={folderName}
                folderColor={getFolderColor(folderName)}
                materials={folderMaterials[folderName] || []}
                getTypeIcon={getTypeIcon}
                onUpdate={fetchSubjectAndMaterials}
                onDrop={handleMoveMaterial}
                onDeleteFolder={handleDeleteFolder}
                onEditFolder={handleEditFolder}
                onMaterialDragStart={setDraggingMaterial}
                draggingMaterial={draggingMaterial}
                existingFolders={allFolderNames}
                onAddMaterial={handleAddMaterialClick}
              />
            ))}
          </div>
        )}

        <CreateFolderDialog
          open={showCreateFolderDialog}
          onOpenChange={setShowCreateFolderDialog}
          onCreateFolder={handleCreateFolder}
          existingFolders={allFolderNames}
        />

        <AddMaterialDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          subjectId={id!}
          onSuccess={fetchSubjectAndMaterials}
          existingFolders={allFolderNames}
          selectedFolder={selectedFolder}
        />
      </main>
    </div>
  );
};

export default SubjectDetail;