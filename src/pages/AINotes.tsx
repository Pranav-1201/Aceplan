import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NotesList from "@/components/ai-notes/NotesList";
import GenerateNotes from "@/components/ai-notes/GenerateNotes";
import NoteEditor from "@/components/ai-notes/NoteEditor";

const AINotes = () => {
  const [view, setView] = useState<"tabs" | "edit">("tabs");
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  if (view === "edit" && editingNoteId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader currentPage="ai-notes" />
        <NoteEditor
          noteId={editingNoteId}
          onBack={() => {
            setView("tabs");
            setEditingNoteId(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="ai-notes" />
      <main className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">AI Notes</h2>
        <Tabs defaultValue="my-notes">
          <TabsList>
            <TabsTrigger value="my-notes">My AI Notes</TabsTrigger>
            <TabsTrigger value="generate">Generate New</TabsTrigger>
          </TabsList>
          <TabsContent value="my-notes" className="mt-6">
            <NotesList
              onEdit={(id) => {
                setEditingNoteId(id);
                setView("edit");
              }}
            />
          </TabsContent>
          <TabsContent value="generate" className="mt-6">
            <GenerateNotes
              onNoteCreated={(id) => {
                setEditingNoteId(id);
                setView("edit");
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AINotes;
