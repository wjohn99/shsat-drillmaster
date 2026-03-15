import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/bank/FilterPanel";
import { QuestionCard } from "@/components/question/QuestionCard";
import { getFilteredQuestions } from "@/data/mockData";
import { Loader2, Grid3X3, List } from "lucide-react";

const QuestionBank = () => {
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  const filteredQuestions = useMemo(() => {
    return getFilteredQuestions(filters);
  }, [filters]);

  const handleFiltersChange = async (newFilters: any) => {
    setIsLoading(true);
    setFilters(newFilters);
    // Simulate loading delay
    setTimeout(() => setIsLoading(false), 300);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-80 flex-shrink-0">
            <FilterPanel 
              totalCount={3290}
              filteredCount={filteredQuestions.length}
              onFiltersChange={handleFiltersChange}
            />
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">Question Bank</h1>
                <Badge variant="secondary" className="text-sm">
                  {filteredQuestions.length} questions
                </Badge>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Questions Grid/List */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredQuestions.length > 0 ? (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 lg:grid-cols-2 gap-6" 
                  : "space-y-4"
              }>
                {filteredQuestions.map((question) => (
                  <QuestionCard 
                    key={question.id} 
                    question={question}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="text-center py-12">
                  <p className="text-muted-foreground">
                    No questions found. Try adjusting your filters.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Load More */}
            {filteredQuestions.length > 0 && !isLoading && (
              <div className="text-center mt-8">
                <Button variant="outline">
                  Load More Questions
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBank;