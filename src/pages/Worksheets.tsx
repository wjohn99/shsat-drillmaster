import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Plus, 
  Sparkles, 
  Clock,
  BookOpen,
  Target,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

const Worksheets = () => {
  const presetWorksheets = [
    {
      id: 'algebra-basics',
      title: 'Algebra Basics',
      description: 'Linear equations and expressions fundamentals',
      questionCount: 20,
      difficulty: 'Medium',
      estimatedTime: '30 min',
      subject: 'MATH'
    },
    {
      id: 'reading-comp-1',
      title: 'Reading Comprehension Set 1',
      description: 'Science and technology passages',
      questionCount: 15,
      difficulty: 'Medium',
      estimatedTime: '25 min',
      subject: 'ELA'
    },
    {
      id: 'grammar-essentials',
      title: 'Grammar Essentials',
      description: 'Comma usage and sentence structure',
      questionCount: 25,
      difficulty: 'Easy',
      estimatedTime: '20 min',
      subject: 'ELA'
    },
    {
      id: 'geometry-shapes',
      title: 'Geometry & Shapes',
      description: 'Area, volume, and coordinate geometry',
      questionCount: 18,
      difficulty: 'Hard',
      estimatedTime: '35 min',
      subject: 'MATH'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Worksheets</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Create focused practice sessions with curated question sets, 
            custom worksheets, or AI-generated content.
          </p>
        </div>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Pre-set Worksheets</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Ready-made worksheets covering key SHSAT topics and skills.
              </p>
              <Button className="w-full">
                Browse Pre-sets
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-ela flex items-center justify-center mx-auto mb-4">
                <Plus className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Customize</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Select specific questions from the question bank to create your own worksheet.
              </p>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/question-bank">
                  Create Custom
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-2 hover:border-primary/50">
            <CardHeader className="text-center">
              <div className="h-16 w-16 rounded-full bg-gradient-math flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-xl">Generate with AI</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground mb-4">
                Let AI create personalized worksheets based on your learning goals.
              </p>
              <Button variant="outline" className="w-full">
                Generate Worksheet
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Pre-set Worksheets Section */}
        <section>
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold">Featured Pre-set Worksheets</h2>
            <Button variant="outline">View All</Button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {presetWorksheets.map((worksheet) => (
              <Card key={worksheet.id} className="group hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className="flex items-center justify-between mb-2">
                    <Badge 
                      variant={worksheet.subject === 'MATH' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {worksheet.subject}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {worksheet.difficulty}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg leading-tight">
                    {worksheet.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {worksheet.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <div className="flex items-center">
                      <BookOpen className="h-3 w-3 mr-1" />
                      {worksheet.questionCount} questions
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {worksheet.estimatedTime}
                    </div>
                  </div>

                  <Button className="w-full" size="sm">
                    Start Worksheet
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Worksheets;