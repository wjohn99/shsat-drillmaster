import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { FilterPanel } from "@/components/bank/FilterPanel";
import { QuestionCard } from "@/components/question/QuestionCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Grid3X3, List } from "lucide-react";
import { questions, getFilteredQuestions } from "@/data/mockData";

export default function Bank() {
  const [filters, setFilters] = useState({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);

  const filteredQuestions = useMemo(() => {
    return getFilteredQuestions(filters);
  }, [filters]);

  const handleFiltersChange = (newFilters: any) => {
    setIsLoading(true);
    setFilters(newFilters);
    // Simulate API delay
    setTimeout(() => setIsLoading(false), 150);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Filter Panel */}
        <FilterPanel
          totalCount={questions.length}
          filteredCount={filteredQuestions.length}
          onFiltersChange={handleFiltersChange}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="border-b bg-card px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Question Bank</h1>
                <Badge variant="secondary">
                  {filteredQuestions.length} question{filteredQuestions.length !== 1 ? 's' : ''}
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
          </div>

          {/* Questions Grid */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredQuestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-lg font-semibold mb-2">No questions found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your filters to see more results.
                </p>
              </div>
            ) : (
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
                  : "space-y-4"
              }>
                {filteredQuestions.map((question) => (
                  <QuestionCard key={question.id} question={question} />
                ))}
              </div>
            )}

            {/* Load More (placeholder for infinite scroll) */}
            {filteredQuestions.length > 0 && filteredQuestions.length >= 20 && (
              <div className="flex justify-center mt-8">
                <Button variant="outline" disabled>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading more questions...
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}