import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CertificateCardProps {
  certificate: {
    id: string;
    title: string;
    issuing_organization: string;
    issue_date: string;
    file_url?: string;
  };
  onDelete: () => void;
}

export const CertificateCard = ({ certificate, onDelete }: CertificateCardProps) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this certificate?")) return;

    try {
      const { error } = await supabase
        .from("certificates")
        .delete()
        .eq("id", certificate.id);

      if (error) throw error;

      toast.success("Certificate deleted successfully");
      onDelete();
    } catch (error: any) {
      toast.error(error.message || "Failed to delete certificate");
    }
  };

  const handleDownload = () => {
    if (certificate.file_url) {
      window.open(certificate.file_url, "_blank");
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Award className="h-5 w-5 text-primary" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm mb-1 truncate">{certificate.title}</h4>
            <p className="text-sm text-muted-foreground mb-1">
              {certificate.issuing_organization}
            </p>
            <p className="text-xs text-muted-foreground">
              Issued: {formatDate(certificate.issue_date)}
            </p>
          </div>

          <div className="flex gap-1">
            {certificate.file_url && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDownload}
                title="Download certificate"
              >
                <Download className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDelete}
              title="Delete certificate"
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
