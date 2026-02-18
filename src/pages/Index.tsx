import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, Clock, FileText, Sparkles, TrendingUp, Users } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import heroImage from "@/assets/hero-image.jpg";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-background/80 border-b border-border">
        <div className="container mx-auto px-4 sm:px-6 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              AcePlan
            </span>
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/10 dark:from-primary/5 dark:to-accent/5" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        
        <div className="container relative mx-auto px-4 sm:px-6 py-16 sm:py-20 md:py-28">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in">
              <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-scale-in">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Smart Study Management</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                Master Your{" "}
                <span className="bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent animate-pulse">
                  Studies
                </span>
                {" "}with AcePlan
              </h1>
              
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl">
                Your all-in-one study management platform. Organize materials, track time, 
                manage your timetable, and ace your exams with intelligent insights.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  size="lg"
                  onClick={() => navigate("/auth")}
                  className="group relative overflow-hidden bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <span className="relative z-10">Get Started Free</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => navigate("/auth")}
                  className="border-2 hover:bg-accent/10 hover:border-accent transition-all duration-300 hover:scale-105"
                >
                  Sign In
                </Button>
              </div>

              <div className="flex items-center space-x-6 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background"
                    />
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">10,000+</span> students already excelling
                </div>
              </div>
            </div>

            <div className="relative lg:block animate-fade-in animation-delay-200">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-3xl blur-3xl animate-pulse" />
              <img
                src={heroImage}
                alt="Study management dashboard showing organized timetable, subjects, and study materials"
                className="relative rounded-3xl shadow-2xl border border-border/50 hover:scale-[1.02] transition-transform duration-500"
              />
              
              {/* Floating cards */}
              <div className="absolute -top-4 -right-4 bg-card border border-border rounded-xl p-4 shadow-lg animate-float">
                <TrendingUp className="h-6 w-6 text-accent mb-2" />
                <div className="text-sm font-semibold">95% Success Rate</div>
              </div>
              
              <div className="absolute -bottom-4 -left-4 bg-card border border-border rounded-xl p-4 shadow-lg animate-float animation-delay-500">
                <Users className="h-6 w-6 text-primary mb-2" />
                <div className="text-sm font-semibold">Join 10k+ Students</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 sm:py-28 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Everything You Need to{" "}
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Excel
              </span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Powerful features designed to help you study smarter, not harder
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {[
              {
                icon: BookOpen,
                title: "Organize Subjects",
                description: "Keep all your subjects and courses in one organized place with color coding",
                color: "primary",
                delay: "0"
              },
              {
                icon: Calendar,
                title: "Track Exam Dates",
                description: "Never miss an exam with our smart calendar system and reminders",
                color: "accent",
                delay: "100"
              },
              {
                icon: FileText,
                title: "Manage Materials",
                description: "Store notes, PDFs, videos, and links all in one searchable place",
                color: "primary",
                delay: "200"
              },
              {
                icon: Clock,
                title: "Study Timer",
                description: "Track your daily study hours, build streaks, and stay consistent",
                color: "accent",
                delay: "300"
              }
            ].map((feature, index) => (
              <div
                key={index}
                className="group relative bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 animate-fade-in"
                style={{ animationDelay: `${feature.delay}ms` }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className={`relative inline-flex p-4 rounded-2xl bg-${feature.color}/10 mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className={`h-8 w-8 text-${feature.color}`} />
                </div>
                
                <h3 className="relative text-xl font-semibold mb-3">{feature.title}</h3>
                <p className="relative text-muted-foreground">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-28">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary to-accent p-12 sm:p-16 text-center animate-fade-in">
            <div className="absolute inset-0 bg-grid-pattern opacity-10" />
            
            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white">
                Ready to Transform Your Study Habits?
              </h2>
              <p className="text-lg sm:text-xl text-white/90">
                Join thousands of students who are already achieving their academic goals with AcePlan
              </p>
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-white text-primary hover:bg-white/90 shadow-2xl hover:scale-105 transition-all duration-300 mt-4"
              >
                Start Your Journey
              </Button>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-10 right-10 h-20 w-20 rounded-full bg-white/10 blur-xl animate-pulse" />
            <div className="absolute bottom-10 left-10 h-32 w-32 rounded-full bg-white/10 blur-xl animate-pulse animation-delay-500" />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-8">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="font-semibold">AcePlan</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 AcePlan. Empowering students worldwide.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
