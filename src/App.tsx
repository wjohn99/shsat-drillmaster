import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ViewAsStudentProvider } from "@/contexts/ViewAsStudentContext";
import { DemoTutorialProvider } from "@/contexts/DemoTutorialContext";
import { DemoTutorialCoach } from "@/components/demo/DemoTutorialCoach";
import { QuestionBookmarksProvider } from "@/contexts/QuestionBookmarksContext";
import { QuestionReviewProvider } from "@/contexts/QuestionReviewContext";
import { QuestionReportsProvider } from "@/contexts/QuestionReportsContext";
import { QuestionsProvider } from "@/contexts/QuestionsContext";
import { ExamLockProvider } from "@/contexts/ExamLockContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuestionBank from "./pages/QuestionBank";
import Worksheets from "./pages/Worksheets";
import WorksheetPrint from "./pages/WorksheetPrint";
import Practice from "./pages/Practice";
import Question from "./pages/Question";
import QuestionSet from "./pages/QuestionSet";
import PracticeSetup from "./pages/PracticeSetup";
import Forms from "./pages/Forms";
import DiagnosticExam from "./pages/DiagnosticExam";
import Passages from "./pages/Passages";
import TopicBrowser from "./pages/TopicBrowser";
import TopicQuestions from "./pages/TopicQuestions";
import NotFound from "./pages/NotFound";
import BlitzMode from "./pages/BlitzMode";
import Workspace from "./pages/Workspace";
import QuestionSubmission from "./pages/QuestionSubmission";
import { TutorRoute } from "@/components/auth/TutorRoute";
import { WorksheetResumeGate } from "@/components/worksheets/WorksheetResumeGate";

const queryClient = new QueryClient();

function RequireAuth({
  children,
  allowParent = false,
}: {
  children: React.ReactNode;
  allowParent?: boolean;
}) {
  return <ProtectedRoute allowParent={allowParent}>{children}</ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ViewAsStudentProvider>
      <QuestionReportsProvider>
      <QuestionReviewProvider>
      <QuestionBookmarksProvider>
      <QuestionsProvider>
      <ExamLockProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <DemoTutorialProvider>
          <WorksheetResumeGate>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth allowParent>
                  <Dashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/question-bank"
              element={
                <RequireAuth>
                  <QuestionBank />
                </RequireAuth>
              }
            />
            <Route
              path="/worksheets"
              element={
                <RequireAuth allowParent>
                  <Worksheets />
                </RequireAuth>
              }
            />
            <Route
              path="/worksheets/print"
              element={
                <RequireAuth>
                  <WorksheetPrint />
                </RequireAuth>
              }
            />
            <Route
              path="/practice"
              element={
                <RequireAuth>
                  <Practice />
                </RequireAuth>
              }
            />
            <Route
              path="/practice/diagnostic"
              element={
                <RequireAuth allowParent>
                  <DiagnosticExam />
                </RequireAuth>
              }
            />
            <Route
              path="/practice/:type"
              element={
                <RequireAuth>
                  <PracticeSetup />
                </RequireAuth>
              }
            />
            <Route
              path="/practice-set"
              element={
                <RequireAuth>
                  <QuestionSet />
                </RequireAuth>
              }
            />
            <Route
              path="/question/:id"
              element={
                <RequireAuth>
                  <Question />
                </RequireAuth>
              }
            />
            <Route
              path="/topic-browser"
              element={
                <RequireAuth>
                  <TopicBrowser />
                </RequireAuth>
              }
            />
            <Route
              path="/topic/:topicId"
              element={
                <RequireAuth>
                  <TopicQuestions />
                </RequireAuth>
              }
            />
            <Route
              path="/forms"
              element={
                <RequireAuth>
                  <Forms />
                </RequireAuth>
              }
            />
            <Route
              path="/passages"
              element={
                <RequireAuth>
                  <Passages />
                </RequireAuth>
              }
            />
            <Route
              path="/blitz"
              element={
                <RequireAuth>
                  <BlitzMode />
                </RequireAuth>
              }
            />
            <Route
              path="/workspace"
              element={
                <RequireAuth allowParent>
                  <Workspace />
                </RequireAuth>
              }
            />
            <Route
              path="/workspace/:boardId"
              element={
                <RequireAuth allowParent>
                  <Workspace />
                </RequireAuth>
              }
            />
            <Route
              path="/question-submission"
              element={
                <RequireAuth>
                  <TutorRoute>
                    <QuestionSubmission />
                  </TutorRoute>
                </RequireAuth>
              }
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route
              path="*"
              element={
                <RequireAuth>
                  <NotFound />
                </RequireAuth>
              }
            />
          </Routes>
          </WorksheetResumeGate>
          <DemoTutorialCoach />
          </DemoTutorialProvider>
        </BrowserRouter>
      </TooltipProvider>
      </ExamLockProvider>
      </QuestionsProvider>
      </QuestionBookmarksProvider>
      </QuestionReviewProvider>
      </QuestionReportsProvider>
      </ViewAsStudentProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
