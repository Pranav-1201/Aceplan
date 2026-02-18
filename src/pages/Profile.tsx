import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Upload, FileText, Plus, Award } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { AddCertificateDialog } from "@/components/AddCertificateDialog";
import { CertificateCard } from "@/components/CertificateCard";
import BadgeCard from "@/components/BadgeCard";
import { getUserBadges, checkProfileCompleteBadge, type Badge, type BadgeType, BADGE_INFO } from "@/lib/badgeUtils";
import { AvatarEditorDialog } from "@/components/AvatarEditorDialog";
import AppHeader from "@/components/AppHeader";

interface Profile {
  full_name: string;
  email: string;
  username?: string;
  avatar_url?: string;
  resume_url?: string;
  age?: number;
  birthday?: string;
  profession?: string;
  tenth_percentage?: number;
  twelfth_percentage?: number;
  current_cgpa?: number;
  school_name?: string;
  ug_college?: string;
  ug_course?: string;
  pg_college?: string;
  pg_course?: string;
}

interface Certificate {
  id: string;
  title: string;
  issuing_organization: string;
  issue_date: string;
  file_url?: string;
}

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile>({ 
    full_name: "", 
    email: "",
    username: "",
    avatar_url: "",
    resume_url: "",
    age: undefined,
    birthday: "",
    profession: "",
    tenth_percentage: undefined,
    twelfth_percentage: undefined,
    current_cgpa: undefined,
    school_name: "",
    ug_college: "",
    ug_course: "",
    pg_college: "",
    pg_course: ""
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [showAddCertificate, setShowAddCertificate] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [tempAvatarUrl, setTempAvatarUrl] = useState<string>("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchProfile();
      fetchCertificates();
      fetchBadges();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const [profileRes, gpaRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .eq("id", user?.id)
          .single(),
        supabase
          .from("semester_gpas")
          .select("semester, gpa, credits")
          .eq("user_id", user?.id)
      ]);

      if (profileRes.error) throw profileRes.error;
      
      // Always calculate CGPA from semester GPAs (same logic as Exams page)
      let calculatedCGPA: number | undefined = undefined;
      
      if (gpaRes.data && gpaRes.data.length > 0) {
        // Sort semesters numerically
        const sortedGPAs = [...gpaRes.data].sort((a, b) => {
          const numA = parseInt(a.semester.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.semester.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });
        
        let totalWeightedGPA = 0;
        let totalCredits = 0;
        let simpleSum = 0;
        let count = 0;
        
        sortedGPAs.forEach((g) => {
          if (g.gpa != null) {
            const gpaValue = typeof g.gpa === 'string' ? parseFloat(g.gpa) : g.gpa;
            const creditsValue = g.credits ? (typeof g.credits === 'string' ? parseInt(g.credits) : g.credits) : null;
            
            if (creditsValue && creditsValue > 0) {
              totalWeightedGPA += gpaValue * creditsValue;
              totalCredits += creditsValue;
            } else {
              simpleSum += gpaValue;
              count++;
            }
          }
        });
        
        if (totalCredits > 0) {
          calculatedCGPA = totalWeightedGPA / totalCredits;
        } else if (count > 0) {
          calculatedCGPA = simpleSum / count;
        }
      }
      
      // Use calculated CGPA if available, otherwise fall back to profile value
      const finalCGPA = calculatedCGPA !== undefined ? calculatedCGPA : profileRes.data?.current_cgpa;
      
      if (profileRes.data) {
        setProfile({
          full_name: profileRes.data.full_name || "",
          email: profileRes.data.email || "",
          username: profileRes.data.username || "",
          avatar_url: profileRes.data.avatar_url || "",
          resume_url: profileRes.data.resume_url || "",
          age: profileRes.data.age || undefined,
          birthday: profileRes.data.birthday || "",
          profession: profileRes.data.profession || "",
          tenth_percentage: profileRes.data.tenth_percentage || undefined,
          twelfth_percentage: profileRes.data.twelfth_percentage || undefined,
          current_cgpa: finalCGPA || undefined,
          school_name: profileRes.data.school_name || "",
          ug_college: profileRes.data.ug_college || "",
          ug_course: profileRes.data.ug_course || "",
          pg_college: profileRes.data.pg_college || "",
          pg_course: profileRes.data.pg_course || "",
        });
      }
    } catch (error: any) {
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", user?.id)
        .order("issue_date", { ascending: false });

      if (error) throw error;

      if (data) {
        setCertificates(data);
      }
    } catch (error: any) {
      console.error("Failed to load certificates:", error);
    }
  };

  const fetchBadges = async () => {
    if (!user) return;
    const userBadges = await getUserBadges(user.id);
    setBadges(userBadges);
  };

  const calculateAge = (birthday: string) => {
    if (!birthday) return undefined;
    const today = new Date();
    const birthDate = new Date(birthday);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const handleBirthdayChange = (value: string) => {
    const age = calculateAge(value);
    setProfile({ ...profile, birthday: value, age });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: profile.full_name,
          username: profile.username,
          age: profile.age,
          birthday: profile.birthday || null,
          profession: profile.profession,
          tenth_percentage: profile.tenth_percentage,
          twelfth_percentage: profile.twelfth_percentage,
          current_cgpa: profile.current_cgpa,
          school_name: profile.school_name,
          ug_college: profile.ug_college,
          ug_course: profile.ug_course,
          pg_college: profile.pg_college,
          pg_course: profile.pg_course,
        })
        .eq("id", user?.id);

      if (error) {
        if (error.code === "23505" && error.message.includes("username")) {
          toast.error("This nickname is already taken. Please choose another one.");
          return;
        }
        throw error;
      }

      // Check profile complete badge
      if (user) {
        await checkProfileCompleteBadge(user.id, profile);
        await fetchBadges();
      }

      toast.success("Profile updated successfully");
    } catch (error: any) {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };


  const handleAvatarSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const objectUrl = URL.createObjectURL(file);
    setTempAvatarUrl(objectUrl);
    setShowAvatarEditor(true);
  };

  const handleAvatarSave = async (croppedImage: Blob) => {
    if (!user) return;

    const fileExt = 'jpg';
    const filePath = `${user.id}/avatar.${fileExt}`;

    try {
      setUploading(true);

      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, croppedImage, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('study-materials')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, avatar_url: publicUrl });
      setShowAvatarEditor(false);
      toast.success("Profile picture updated!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload profile picture");
    } finally {
      setUploading(false);
      if (tempAvatarUrl) {
        URL.revokeObjectURL(tempAvatarUrl);
        setTempAvatarUrl("");
      }
    }
  };

  const handleResumeUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    const fileExt = file.name.split('.').pop();
    const filePath = `${user.id}/resume.${fileExt}`;

    try {
      setUploadingResume(true);

      const { error: uploadError } = await supabase.storage
        .from('study-materials')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('study-materials')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ resume_url: publicUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setProfile({ ...profile, resume_url: publicUrl });
      toast.success("Resume uploaded successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to upload resume");
    } finally {
      setUploadingResume(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="h-12 w-12 animate-pulse text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="profile" />

      <main className="container mx-auto px-4 sm:px-6 py-6 md:py-8 max-w-6xl">
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Left Column - Personal Information */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your profile details</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  {/* Profile Picture */}
                  <div className="flex flex-col items-center space-y-4">
                    <Avatar className="h-24 w-24">
                      <AvatarImage src={profile.avatar_url} />
                      <AvatarFallback className="text-2xl">
                        {profile.full_name 
                          ? profile.full_name.charAt(0).toUpperCase() 
                          : profile.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <Label htmlFor="avatar-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        <Upload className="h-4 w-4" />
                        {uploading ? "Uploading..." : "Upload Picture"}
                      </div>
                      <Input
                        id="avatar-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleAvatarSelect}
                        disabled={uploading}
                      />
                    </Label>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="full_name">Full Name</Label>
                    <Input
                      id="full_name"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="username">Nickname (Must be unique)</Label>
                      <Input
                        id="username"
                        value={profile.username || ""}
                        onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                        placeholder="Choose a unique nickname"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="birthday">Birthday</Label>
                      <Input
                        id="birthday"
                        type="date"
                        value={profile.birthday || ""}
                        onChange={(e) => handleBirthdayChange(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Age (Auto-calculated from birthday)</Label>
                    <Input
                      id="age"
                      type="number"
                      value={profile.age || ""}
                      disabled
                      placeholder="Enter birthday to calculate age"
                      className="bg-muted cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Profession</Label>
                    <RadioGroup
                      value={profile.profession || ""}
                      onValueChange={(value) => setProfile({ ...profile, profession: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Student" id="student" />
                        <Label htmlFor="student" className="font-normal cursor-pointer">Student</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Undergraduate" id="undergraduate" />
                        <Label htmlFor="undergraduate" className="font-normal cursor-pointer">Undergraduate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Postgraduate" id="postgraduate" />
                        <Label htmlFor="postgraduate" className="font-normal cursor-pointer">Postgraduate</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Masters" id="masters" />
                        <Label htmlFor="masters" className="font-normal cursor-pointer">Masters</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Professor" id="professor" />
                        <Label htmlFor="professor" className="font-normal cursor-pointer">Professor</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="Employee" id="employee" />
                        <Label htmlFor="employee" className="font-normal cursor-pointer">Employee</Label>
                      </div>
                    </RadioGroup>
                  </div>

                    <Separator className="my-6" />

                    <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Academic Information</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="school_name">School Name</Label>
                      <Input
                        id="school_name"
                        value={profile.school_name || ""}
                        onChange={(e) => setProfile({ ...profile, school_name: e.target.value })}
                        placeholder="Enter your school name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="tenth_percentage">10th Percentage</Label>
                        <Input
                          id="tenth_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={profile.tenth_percentage || ""}
                          onChange={(e) => setProfile({ 
                            ...profile, 
                            tenth_percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          placeholder="e.g., 85.5"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="twelfth_percentage">12th Percentage</Label>
                        <Input
                          id="twelfth_percentage"
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={profile.twelfth_percentage || ""}
                          onChange={(e) => setProfile({ 
                            ...profile, 
                            twelfth_percentage: e.target.value ? parseFloat(e.target.value) : undefined 
                          })}
                          placeholder="e.g., 92.0"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ug_college">Undergraduate College</Label>
                      <Input
                        id="ug_college"
                        value={profile.ug_college || ""}
                        onChange={(e) => setProfile({ ...profile, ug_college: e.target.value })}
                        placeholder="Enter your UG college name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ug_course">Undergraduate Course</Label>
                      <Input
                        id="ug_course"
                        value={profile.ug_course || ""}
                        onChange={(e) => setProfile({ ...profile, ug_course: e.target.value })}
                        placeholder="e.g., B.Tech in Computer Science"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pg_college">Postgraduate College</Label>
                      <Input
                        id="pg_college"
                        value={profile.pg_college || ""}
                        onChange={(e) => setProfile({ ...profile, pg_college: e.target.value })}
                        placeholder="Enter your PG college name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="pg_course">Postgraduate Course</Label>
                      <Input
                        id="pg_course"
                        value={profile.pg_course || ""}
                        onChange={(e) => setProfile({ ...profile, pg_course: e.target.value })}
                        placeholder="e.g., M.Tech in AI & ML"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="current_cgpa">Current CGPA</Label>
                      <Input
                        id="current_cgpa"
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        value={profile.current_cgpa !== undefined ? profile.current_cgpa.toFixed(2) : ""}
                        onChange={(e) => setProfile({ 
                          ...profile, 
                          current_cgpa: e.target.value ? parseFloat(e.target.value) : undefined 
                        })}
                        placeholder="e.g., 8.5"
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Resume & Certificates */}
          <div className="lg:col-span-1 space-y-6">
            {/* Resume/CV Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Resume / CV
                </CardTitle>
                <CardDescription>Upload your resume or curriculum vitae</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {profile.resume_url && (
                    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium text-sm">Resume uploaded</p>
                          <p className="text-xs text-muted-foreground">Click to view or download</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(profile.resume_url, "_blank")}
                      >
                        View
                      </Button>
                    </div>
                  )}
                  
                  <Label htmlFor="resume-upload" className="cursor-pointer">
                    <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed rounded-lg hover:border-primary hover:bg-primary/5 transition-colors">
                      <Upload className="h-4 w-4" />
                      {uploadingResume ? "Uploading..." : profile.resume_url ? "Upload New Resume" : "Upload Resume"}
                    </div>
                    <Input
                      id="resume-upload"
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={handleResumeUpload}
                      disabled={uploadingResume}
                    />
                  </Label>
                  <p className="text-xs text-muted-foreground text-center">
                    Accepted formats: PDF, DOC, DOCX
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Certificates Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5" />
                      Certificates
                    </CardTitle>
                    <CardDescription>Manage your professional certificates</CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowAddCertificate(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {certificates.length === 0 ? (
                  <div className="text-center py-8">
                    <Award className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                    <p className="text-muted-foreground mb-4">No certificates added yet</p>
                    <Button
                      variant="outline"
                      onClick={() => setShowAddCertificate(true)}
                    >
                      Add Your First Certificate
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((certificate) => (
                      <CertificateCard
                        key={certificate.id}
                        certificate={certificate}
                        onDelete={fetchCertificates}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Badges Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
                <CardDescription>
                  {badges.length} of {Object.keys(BADGE_INFO).length} badges earned
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(Object.keys(BADGE_INFO) as BadgeType[]).map((badgeType) => {
                    const earnedBadge = badges.find(b => b.badge_type === badgeType);
                    return (
                      <BadgeCard
                        key={badgeType}
                        badgeType={badgeType}
                        earned={!!earnedBadge}
                        earnedAt={earnedBadge?.earned_at}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <AddCertificateDialog
        open={showAddCertificate}
        onOpenChange={setShowAddCertificate}
        onCertificateAdded={fetchCertificates}
        userId={user?.id || ""}
      />

      <AvatarEditorDialog
        open={showAvatarEditor}
        onOpenChange={setShowAvatarEditor}
        imageUrl={tempAvatarUrl}
        onSave={handleAvatarSave}
      />
    </div>
  );
};

export default Profile;
