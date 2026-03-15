import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, Play } from "lucide-react";
import { forms } from "@/data/mockData";
import { Link } from "react-router-dom";

export default function Forms() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Practice Forms</h1>
          <p className="text-muted-foreground">
            Curated question sets designed to target specific skills and concepts.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {forms.map((form) => (
            <Card key={form.id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{form.name}</CardTitle>
                  <Badge variant="outline">{form.questions.length} Qs</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{form.description}</p>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{form.timeLimit} min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{form.questions.length} questions</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to={`/forms/${form.id}`}>
                      <Play className="h-4 w-4 mr-2" />
                      Start Practice
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/forms/${form.id}/preview`}>Preview</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-lg font-semibold mb-2">More Forms Coming Soon</h3>
          <p className="text-muted-foreground">
            We're working on adding more practice forms covering all SHSAT topics.
          </p>
        </div>
      </div>
    </div>
  );
}