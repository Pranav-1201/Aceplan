import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { 
  BookOpen, LogOut, User as UserIcon, BarChart3, 
  ClipboardList, Library, Sparkles, BrainCircuit 
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

interface AppHeaderProps {
  currentPage?: 'dashboard' | 'timetable' | 'my-subjects' | 'exams' | 'ai-notes' | 'quiz' | 'statistics' | 'profile';
}

const AppHeader = ({ currentPage }: AppHeaderProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/auth");
    }
  };

  const navItems = [
    { key: 'my-subjects', label: 'My Subjects', icon: Library, path: '/my-subjects' },
    { key: 'exams', label: 'Exams', icon: ClipboardList, path: '/exams' },
    { key: 'ai-notes', label: 'AI Notes', icon: Sparkles, path: '/ai-notes' },
    { key: 'quiz', label: 'Quiz', icon: BrainCircuit, path: '/quiz' },
    { key: 'statistics', label: 'Statistics', icon: BarChart3, path: '/statistics' },
    { key: 'profile', label: 'Profile', icon: UserIcon, path: '/profile' },
  ];

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => navigate("/dashboard")}
          >
            <BookOpen className="h-5 w-5 md:h-6 md:w-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">AcePlan</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.key;
              
              return (
                <div key={item.key}>
                  <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    size="sm" 
                    onClick={() => navigate(item.path)} 
                    className="hidden sm:flex"
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    <span className="hidden md:inline">{item.label}</span>
                  </Button>
                  <Button 
                    variant={isActive ? "secondary" : "ghost"} 
                    size="icon" 
                    onClick={() => navigate(item.path)} 
                    className="sm:hidden"
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <ThemeToggle />
            <Button variant="ghost" size="sm" onClick={handleSignOut} className="hidden sm:flex">
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden lg:inline">Sign Out</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} className="sm:hidden">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
