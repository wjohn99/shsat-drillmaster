import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  FileEdit, 
  Calculator, 
  Target,
  TrendingUp,
  Clock,
  ArrowRight,
  Edit3
} from "lucide-react";
import { Link } from "react-router-dom";

const Practice = () => {
  const practiceTypes = [
    {
      id: 'reading-comprehension',
      title: 'Reading Comprehension',
      description: 'Adaptive practice with reading passages from various subjects',
      icon: BookOpen,
      color: 'bg-gradient-ela',
      features: ['8 Different Passages', 'Adaptive Difficulty', 'Instant Feedback'],
      estimatedTime: '45-60 min'
    },
    {
      id: 'revising-editing-a',
      title: 'Revising & Editing Part A',
      description: 'Grammar, punctuation, and sentence structure practice',
      icon: FileEdit,
      color: 'bg-gradient-primary',
      features: ['Grammar Rules', 'Punctuation', 'Sentence Structure'],
      estimatedTime: '30-40 min'
    },
    {
      id: 'revising-editing-b',
      title: 'Revising & Editing Part B',
      description: 'Organization, clarity, and writing improvement',
      icon: FileEdit,
      color: 'bg-gradient-primary',
      features: ['Text Organization', 'Clarity & Style', 'Writing Flow', 'Sentence Structure'],
      estimatedTime: '35-45 min'
    },
    {
      id: 'math',
      title: 'Math',
      description: 'Comprehensive math practice across all SHSAT topics',
      icon: Calculator,
      color: 'bg-gradient-math',
      features: ['Algebra', 'Geometry', 'Data Analysis', 'Applied Math'],
      estimatedTime: '50-70 min'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Adaptive Practice</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Take adaptive practice sessions that adjust to your skill level 
            and focus on areas where you need the most improvement.
          </p>
        </div>

        {/* Practice Types */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {practiceTypes.map((type) => {
            const IconComponent = type.icon;
            return (
              <Card key={type.id} className="group flex h-full flex-col hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
                <CardHeader>
                  <div className={`h-16 w-16 rounded-xl ${type.color} flex items-center justify-center mb-4`}>
                    {IconComponent && <IconComponent className="h-8 w-8 text-white" />}
                    {!IconComponent && <FileEdit className="h-8 w-8 text-white" />}
                  </div>
                  <CardTitle className="text-xl mb-2">{type.title}</CardTitle>
                  <p className="text-muted-foreground">{type.description}</p>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col">
                  <div className="flex flex-1 flex-col gap-4">
                    {/* Practice areas — grows so footer aligns across cards in a row */}
                    <div className="flex min-h-0 flex-1 flex-col">
                      <h4 className="font-medium mb-2">Practice Areas:</h4>
                      <div className="flex flex-wrap content-start gap-2">
                        {type.features.map((feature, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="mt-auto flex flex-col gap-4">
                      {/* Time estimate */}
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="h-4 w-4 mr-2 shrink-0" />
                        Estimated time: {type.estimatedTime}
                      </div>

                      {/* Action button */}
                      <Button className="w-full" asChild>
                        <Link to={`/practice/${type.id}`}>
                          Start Practice
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="bg-secondary/50 rounded-lg p-8">
          <h2 className="text-2xl font-bold text-center mb-8">
            Why Choose Adaptive Practice?
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Personalized Difficulty</h3>
              <p className="text-sm text-muted-foreground">
                Questions adapt to your skill level, providing the right challenge at the right time.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-gradient-ela flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">
                Monitor your improvement over time with detailed analytics and insights.
              </p>
            </div>

            <div className="text-center">
              <div className="h-12 w-12 rounded-full bg-gradient-math flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold mb-2">Focused Learning</h3>
              <p className="text-sm text-muted-foreground">
                Concentrate on your weak areas while maintaining your strengths.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Practice;