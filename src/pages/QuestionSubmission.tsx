import { Header } from "@/components/layout/Header";
import { QuestionSubmissionForm } from "@/components/submission/QuestionSubmissionForm";

const QuestionSubmission = () => {
  return (
    <div className="min-h-screen bg-[#f9f9f7]">
      <Header />

      <div className="container px-4 py-8">
        <QuestionSubmissionForm />
      </div>
    </div>
  );
};

export default QuestionSubmission;
