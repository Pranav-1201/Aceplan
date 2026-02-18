import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload } from "lucide-react";

interface AddCertificateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCertificateAdded: () => void;
  userId: string;
}

export const AddCertificateDialog = ({ 
  open, 
  onOpenChange, 
  onCertificateAdded,
  userId 
}: AddCertificateDialogProps) => {
  const [title, setTitle] = useState("");
  const [issuingOrganization, setIssuingOrganization] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title || !issuingOrganization || !issueDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);

    try {
      let fileUrl = null;

      // Upload file if provided
      if (file) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${userId}/certificates/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('study-materials')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('study-materials')
          .getPublicUrl(filePath);

        fileUrl = publicUrl;
      }

      // Insert certificate
      const { error } = await supabase
        .from("certificates")
        .insert({
          user_id: userId,
          title,
          issuing_organization: issuingOrganization,
          issue_date: issueDate,
          file_url: fileUrl,
        });

      if (error) throw error;

      toast.success("Certificate added successfully");
      setTitle("");
      setIssuingOrganization("");
      setIssueDate("");
      setFile(null);
      onCertificateAdded();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to add certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Certificate</DialogTitle>
          <DialogDescription>
            Add a new certificate to your profile
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Certificate Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., AWS Certified Solutions Architect"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="organization">Issuing Organization *</Label>
            <Input
              id="organization"
              value={issuingOrganization}
              onChange={(e) => setIssuingOrganization(e.target.value)}
              placeholder="e.g., Amazon Web Services"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="issue_date">Issue Date *</Label>
            <Input
              id="issue_date"
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="certificate_file">Certificate File (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="certificate_file"
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              {file && <Upload className="h-4 w-4 text-primary" />}
            </div>
            <p className="text-xs text-muted-foreground">
              Accepted formats: PDF, JPG, PNG
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Certificate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
