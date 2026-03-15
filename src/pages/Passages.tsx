import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText, Clock } from "lucide-react";
import { passages } from "@/data/mockData";
import { Link } from "react-router-dom";

export default function Passages() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Reading Passages</h1>
          <p className="text-muted-foreground">
            Explore reading passages with their associated questions for comprehensive ELA practice.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {passages.map((passage) => (
            <Card key={passage.id} className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{passage.title}</CardTitle>
                  <Badge variant="secondary" className="text-xs bg-ela-secondary text-ela-foreground">ELA</Badge>
                </div>
                {passage.sourceMeta && (
                  <p className="text-sm text-muted-foreground">{passage.sourceMeta}</p>
                )}
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    <span>{passage.questions.length} questions</span>
                  </div>
                </div>

                <p className="text-sm line-clamp-3 leading-relaxed">
                  {passage.body.substring(0, 200)}...
                </p>

                <div className="flex gap-2">
                  <Button asChild className="flex-1">
                    <Link to={`/passage/${passage.id}`}>
                      <BookOpen className="h-4 w-4 mr-2" />
                      Read Passage
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to={`/question-bank?passage=${passage.id}`}>View Questions</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Coming Soon */}
        <div className="mt-12 text-center">
          <div className="text-6xl mb-4">📚</div>
          <h3 className="text-lg font-semibold mb-2">More Passages Coming Soon</h3>
          <p className="text-muted-foreground">
            We're adding more reading passages covering diverse topics and text types.
          </p>
        </div>
      </div>
    </div>
  );
}