import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Search } from "lucide-react";
import { navigationData } from "@/data/navigationData";
import { SubjectNavigation } from "@/types/navigation";

export default function TopicBrowser() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<'ELA' | 'MATH' | 'ALL'>('ALL');
  const navigate = useNavigate();

  const filteredData = navigationData.filter(nav => 
    selectedSubject === 'ALL' || nav.subject === selectedSubject
  );

  const filteredGroups = filteredData.flatMap(nav => 
    nav.groups.filter(group => 
      group.label.toLowerCase().includes(searchQuery.toLowerCase())
    ).map(group => ({ ...group, subject: nav.subject }))
  );

  const handleTopicClick = (topicId: string) => {
    navigate(`/topic/${topicId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Browse by Topic</h1>
          <p className="text-muted-foreground">
            Choose a subject and topic to practice specific skills
          </p>
        </div>

        {/* Subject Tabs */}
        <div className="flex gap-2 mb-6">
          <Badge 
            variant={selectedSubject === 'ALL' ? 'default' : 'outline'}
            className="cursor-pointer px-6 py-2 text-sm"
            onClick={() => setSelectedSubject('ALL')}
          >
            All Subjects
          </Badge>
          <Badge 
            variant={selectedSubject === 'ELA' ? 'default' : 'outline'}
            className="cursor-pointer px-6 py-2 text-sm bg-purple-500 hover:bg-purple-600"
            onClick={() => setSelectedSubject('ELA')}
          >
            English
          </Badge>
          <Badge 
            variant={selectedSubject === 'MATH' ? 'default' : 'outline'}
            className="cursor-pointer px-6 py-2 text-sm bg-blue-500 hover:bg-blue-600"
            onClick={() => setSelectedSubject('MATH')}
          >
            Math
          </Badge>
        </div>

        {/* Search */}
        <div className="relative mb-8">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Subject Sections */}
        {filteredData.map((subjectNav) => (
          <div key={subjectNav.subject} className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <Badge 
                className={`text-lg px-4 py-2 ${
                  subjectNav.subject === 'ELA' 
                    ? 'bg-purple-500 hover:bg-purple-600' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {subjectNav.totalQuestions}
              </Badge>
              <h2 className="text-2xl font-bold">
                {subjectNav.subject === 'ELA' ? 'English' : 'Math'}
              </h2>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {subjectNav.groups
                .filter(group => group.label.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((group) => (
                <Card 
                  key={group.id}
                  className="cursor-pointer hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                  onClick={() => handleTopicClick(group.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge 
                          className={`text-white text-sm px-3 py-1 ${group.color}`}
                        >
                          {group.questionCount}
                        </Badge>
                        <span className="font-medium text-sm leading-relaxed">
                          {group.label}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}

        {/* No Results */}
        {searchQuery && filteredGroups.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No topics found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
}