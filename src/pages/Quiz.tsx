import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import QuizGenerator from "@/components/quiz/QuizGenerator";
import QuizHistory from "@/components/quiz/QuizHistory";
import QuizStats from "@/components/quiz/QuizStats";

const Quiz = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader currentPage="quiz" />
      <main className="container mx-auto px-4 py-6">
        <h2 className="text-2xl font-bold mb-6">AI Quiz Generator</h2>
        <Tabs defaultValue="generate">
          <TabsList>
            <TabsTrigger value="generate">Generate Quiz</TabsTrigger>
            <TabsTrigger value="history">Quiz History</TabsTrigger>
            <TabsTrigger value="statistics">Statistics</TabsTrigger>
          </TabsList>
          <TabsContent value="generate" className="mt-6">
            <QuizGenerator onQuizSaved={() => setRefreshTrigger((p) => p + 1)} />
          </TabsContent>
          <TabsContent value="history" className="mt-6">
            <QuizHistory refreshTrigger={refreshTrigger} />
          </TabsContent>
          <TabsContent value="statistics" className="mt-6">
            <QuizStats />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Quiz;
