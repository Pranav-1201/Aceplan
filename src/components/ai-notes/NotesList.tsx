import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2, Edit, Clock, Loader2, FileText } from "lucide-react";
import { format } from "date-fns";

interface AiNote {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

const NotesList = ({ onEdit }: { onEdit: (id: string) => void }) => {
  const queryClient = useQueryClient();

  const { data: notes, isLoading } = useQuery({
    queryKey: ["ai-notes"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = (await (supabase as any)
        .from("ai_notes")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })) as {
        data: AiNote[] | null;
        error: any;
      };
      if (error) throw error;
      return (data || []) as AiNote[];
    },
  });

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const { error } = await (supabase as any)
      .from("ai_notes")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Failed to delete note");
    } else {
      toast.success("Note deleted");
      queryClient.invalidateQueries({ queryKey: ["ai-notes"] });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!notes?.length) {
    return (
      <div className="text-center py-12 space-y-2">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">No AI-generated notes yet.</p>
        <p className="text-sm text-muted-foreground">
          Switch to the &quot;Generate New&quot; tab to create your first notes!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {notes.map((note) => (
        <Card
          key={note.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onEdit(note.id)}
        >
          <CardHeader>
            <CardTitle className="text-lg line-clamp-2">{note.title}</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {format(new Date(note.updated_at), "MMM d, yyyy h:mm a")}
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note.id);
              }}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => handleDelete(e, note.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default NotesList;
