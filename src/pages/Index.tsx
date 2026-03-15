import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "@/components/layout/Header";
import { 
  BookOpen, 
  Brain, 
  Target, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle,
  ArrowRight,
  Search,
  FileText,
  BarChart3
} from "lucide-react";
import { Link } from "react-router-dom";
import { questions, forms } from "@/data/mockData";
import heroImage from "@/assets/hero-education.jpg";

const Index = () => {
  const stats = {
    totalQuestions: questions.length,
    mathQuestions: questions.filter(q => q.subject === 'MATH').length,
    elaQuestions: questions.filter(q => q.subject === 'ELA').length,
    practiceforms: forms.length
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-black/20" />
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: `url(${heroImage})` }}
        />
        <div className="relative container pt-14 pb-20 md:pt-20 md:pb-24">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
              Master the SHSAT with 
              <span className="block text-transparent bg-gradient-to-r from-yellow-300 to-orange-300 bg-clip-text leading-normal pb-2">
                StepPrep Hub
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-3 leading-relaxed">
              Access hundreds of expertly crafted questions with advanced filtering, 
              instant feedback, and detailed analytics to boost your SHSAT score.
            </p>
            <p className="mb-8">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-sm border border-white/30 px-4 py-2.5 text-sm font-medium text-white shadow-sm">
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" />
                Included with StepPrep Hub: full access to this platform, no extra cost
              </span>
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild variant="hero" size="lg">
                <Link to="/practice">
                  <Search className="h-5 w-5 mr-2" />
                  Start Practice
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="border-white/80 text-white bg-white/10 hover:bg-white hover:text-primary backdrop-blur-sm">
                <Link to="/question-bank">
                  <FileText className="h-5 w-5 mr-2" />
                  Browse Questions
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-secondary/50">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stats.totalQuestions}+
              </div>
              <div className="text-muted-foreground">Practice Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-math mb-2">
                {stats.mathQuestions}
              </div>
              <div className="text-muted-foreground">Math Problems</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-ela mb-2">
                {stats.elaQuestions}
              </div>
              <div className="text-muted-foreground">ELA Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary mb-2">
                {stats.practiceforms}
              </div>
              <div className="text-muted-foreground">Practice Forms</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools and resources 
              you need to excel on the SHSAT.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-math flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Advanced Filtering</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Find exactly what you need with powerful filters by subject, 
                  score band, question type, and skill tags.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-ela flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Instant Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Get immediate explanations and detailed solutions for every question 
                  to understand concepts thoroughly.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Progress Analytics</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Track your performance with detailed analytics showing 
                  strengths, weaknesses, and improvement over time.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-math flex items-center justify-center mb-4">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Targeted Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Focus on specific skills with curated practice forms 
                  designed to target your weakest areas.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-ela flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Timed Practice</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Practice under realistic test conditions with built-in timers 
                  and pacing guidance for optimal performance.
                </p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Reading Passages</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Master ELA with authentic reading passages and 
                  comprehension questions across various text types.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        <div className="relative container text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to Start Your SHSAT Journey?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of students who have improved their scores with our comprehensive practice platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="hero" size="lg" className="bg-white text-primary hover:bg-white/90">
              <Link to="/question-bank">
                Get Started Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="border-white/80 text-white bg-white/10 hover:bg-white hover:text-primary backdrop-blur-sm">
              <Link to="/worksheets">
                View Worksheets
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="h-16 border-t">
        <div className="container h-full">
          <div className="flex h-full items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="flex h-12 w-12 items-center justify-center">
                <img src="/src/assets/logo-icon.png" alt="StepPrep Logo" className="h-12 w-12 object-contain" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold">StepPrep</span>
                <span className="text-xs text-muted-foreground">SHSAT Practice</span>
              </div>
            </div>
            <div className="flex items-center space-x-6 text-sm text-muted-foreground">
              <Link to="/question-bank" className="hover:text-primary transition-colors">Question Bank</Link>
              <Link to="/worksheets" className="hover:text-primary transition-colors">Worksheets</Link>
              <Link to="/practice" className="hover:text-primary transition-colors">Practice</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
