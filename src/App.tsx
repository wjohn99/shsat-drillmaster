import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/question-bank" element={<QuestionBank />} />
          <Route path="/worksheets" element={<Worksheets />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/:type" element={<PracticeSetup />} />
          <Route path="/practice-set" element={<QuestionSet />} />
          <Route path="/question/:id" element={<Question />} />
          <Route path="/topic-browser" element={<TopicBrowser />} />
          <Route path="/topic/:topicId" element={<TopicQuestions />} />
          <Route path="/forms" element={<Forms />} />
          <Route path="/passages" element={<Passages />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
