import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { QuestionBookmarksProvider } from "@/contexts/QuestionBookmarksContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import QuestionBank from "./pages/QuestionBank";
import Worksheets from "./pages/Worksheets";
import Practice from "./pages/Practice";
import Question from "./pages/Question";
import QuestionSet from "./pages/QuestionSet";
import PracticeSetup from "./pages/PracticeSetup";
import Forms from "./pages/Forms";
import Passages from "./pages/Passages";
import TopicBrowser from "./pages/TopicBrowser";
import TopicQuestions from "./pages/TopicQuestions";
import NotFound from "./pages/NotFound";
import BlitzMode from "./pages/BlitzMode";
import Workspace from "./pages/Workspace";
import QuestionSubmission from "./pages/QuestionSubmission";
import { TutorRoute } from "@/components/auth/TutorRoute";

const queryClient = new QueryClient();

function RequireAuth({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <QuestionBookmarksProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Index />} />
            <Route
              path="/dashboard"
              element={
                <RequireAuth>
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
                <RequireAuth>
                  <Worksheets />
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
                <RequireAuth>
                  <Workspace />
                </RequireAuth>
              }
            />
            <Route
              path="/workspace/:boardId"
              element={
                <RequireAuth>
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
        </BrowserRouter>
      </TooltipProvider>
      </QuestionBookmarksProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
