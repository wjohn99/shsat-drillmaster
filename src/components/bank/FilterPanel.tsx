import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, Filter, RotateCcw, ChevronDown } from "lucide-react";
import { Subject, QuestionSubtype, ScoreBand } from "@/types";
import { allTags } from "@/data/mockData";

interface FilterPanelProps {
  totalCount: number;
  filteredCount: number;
  onFiltersChange: (filters: any) => void;
}

export const FilterPanel = ({ totalCount, filteredCount, onFiltersChange }: FilterPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedScoreBands, setSelectedScoreBands] = useState<ScoreBand[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedSubtypes, setSelectedSubtypes] = useState<QuestionSubtype[]>([]);
  const [passageOnly, setPassageOnly] = useState(false);
  const [selectedUserStatus, setSelectedUserStatus] = useState<string[]>([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);

  const subjects: Subject[] = ['MATH', 'ELA'];
  const subtypes: QuestionSubtype[] = ['MC4_A-D', 'MC4_E-H', 'GRID_IN', 'TEI_DRAG_DROP', 'TEI_MULTIPLE_SELECT'];
  const scoreBands: ScoreBand[] = [1, 2, 3, 4, 5, 6, 7, 8];
  const userStatusOptions = [
    { value: 'attempted', label: 'Attempted' },
    { value: 'correct', label: 'Correct' },
    { value: 'bookmarked', label: 'Bookmarked' }
  ];

  const updateFilters = () => {
    onFiltersChange({
      subjects: selectedSubjects,
      scoreBands: selectedScoreBands,
      tagCodes: selectedTags,
      subtypes: selectedSubtypes,
      passageOnly,
      searchQuery,
      userStatus: selectedUserStatus
    });
  };

  // Update filters whenever any filter changes
  useState(() => {
    updateFilters();
  });

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSubjects([]);
    setSelectedScoreBands([]);
    setSelectedTags([]);
    setSelectedSubtypes([]);
    setPassageOnly(false);
    setSelectedUserStatus([]);
    onFiltersChange({});
  };

  const toggleArraySelection = <T,>(array: T[], setArray: (arr: T[]) => void, item: T) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const elaTags = allTags.filter(tag => tag.domain === 'ELA');
  const mathTags = allTags.filter(tag => tag.domain === 'MATH');

  return (
    <div className="w-80 border-r bg-card p-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <h3 className="font-semibold">Filters</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={resetFilters}>
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>

      {/* Results count */}
      <div className="mb-6 p-3 bg-secondary rounded-lg">
        <div className="text-sm font-medium">
          {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} questions
        </div>
        <div className="text-xs text-muted-foreground">
          {filteredCount === totalCount ? "All questions shown" : "Filtered results"}
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Label htmlFor="search" className="text-sm font-medium mb-2 block">Search</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search"
            placeholder="Search questions..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setTimeout(updateFilters, 300); // Debounce
            }}
            className="pl-10"
          />
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Subject filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Subject</Label>
        <div className="flex gap-2">
          {subjects.map((subject) => (
            <Chip
              key={subject}
              variant={selectedSubjects.includes(subject) ? "selected" : subject.toLowerCase() as any}
              onClick={() => {
                toggleArraySelection(selectedSubjects, setSelectedSubjects, subject);
                setTimeout(updateFilters, 0);
              }}
              count={subject === 'MATH' ? 5 : 3} // Mock counts
            >
              {subject}
            </Chip>
          ))}
        </div>
      </div>

      {/* Score Band filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Score Band</Label>
        <div className="grid grid-cols-4 gap-2">
          {scoreBands.map((band) => (
            <button
              key={band}
              onClick={() => {
                toggleArraySelection(selectedScoreBands, setSelectedScoreBands, band);
                setTimeout(updateFilters, 0);
              }}
              className={`
                flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white transition-all
                ${selectedScoreBands.includes(band) ? 'ring-2 ring-ring ring-offset-2' : 'hover:scale-110'}
              `}
              style={{ backgroundColor: `hsl(var(--score-band-${band}))` }}
            >
              {band}
            </button>
          ))}
        </div>
      </div>

      {/* Tags filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Tags</Label>
        <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedTags.length === 0 ? "Select tags..." : `${selectedTags.length} selected`}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search tags..." />
              <CommandList>
                <CommandEmpty>No tags found.</CommandEmpty>
                <CommandGroup heading="ELA Tags">
                  {elaTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => {
                        toggleArraySelection(selectedTags, setSelectedTags, tag.code);
                        setTimeout(updateFilters, 0);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className={`h-3 w-3 rounded-sm border ${
                            selectedTags.includes(tag.code) ? 'bg-ela border-ela' : 'border-border'
                          }`} 
                        />
                        <span className="text-sm">{tag.label}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{tag.code}</Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandGroup heading="Math Tags">
                  {mathTags.map((tag) => (
                    <CommandItem
                      key={tag.id}
                      onSelect={() => {
                        toggleArraySelection(selectedTags, setSelectedTags, tag.code);
                        setTimeout(updateFilters, 0);
                      }}
                    >
                      <div className="flex items-center space-x-2">
                        <div 
                          className={`h-3 w-3 rounded-sm border ${
                            selectedTags.includes(tag.code) ? 'bg-math border-math' : 'border-border'
                          }`} 
                        />
                        <span className="text-sm">{tag.label}</span>
                        <Badge variant="outline" className="ml-auto text-xs">{tag.code}</Badge>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedTags.map((tagCode) => {
              const tag = allTags.find(t => t.code === tagCode);
              return (
                <Chip
                  key={tagCode}
                  variant={tag?.domain === 'MATH' ? 'math' : 'ela'}
                  size="sm"
                  onRemove={() => {
                    setSelectedTags(selectedTags.filter(t => t !== tagCode));
                    setTimeout(updateFilters, 0);
                  }}
                >
                  {tag?.label}
                </Chip>
              );
            })}
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Question Type filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Question Type</Label>
        <div className="grid grid-cols-1 gap-2">
          {subtypes.map((subtype) => (
            <Chip
              key={subtype}
              variant={selectedSubtypes.includes(subtype) ? "selected" : "default"}
              onClick={() => {
                toggleArraySelection(selectedSubtypes, setSelectedSubtypes, subtype);
                setTimeout(updateFilters, 0);
              }}
              className="justify-start"
              size="sm"
            >
              {subtype}
            </Chip>
          ))}
        </div>
      </div>

      {/* Passage Only toggle */}
      <div className="mb-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="passage-only"
            checked={passageOnly}
            onCheckedChange={(checked) => {
              setPassageOnly(checked);
              setTimeout(updateFilters, 0);
            }}
          />
          <Label htmlFor="passage-only" className="text-sm">Passage-based only</Label>
        </div>
      </div>

      <Separator className="mb-6" />

      {/* User Status filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">My Progress</Label>
        <div className="flex flex-col gap-2">
          {userStatusOptions.map((option) => (
            <Chip
              key={option.value}
              variant={selectedUserStatus.includes(option.value) ? "selected" : "default"}
              onClick={() => {
                toggleArraySelection(selectedUserStatus, setSelectedUserStatus, option.value);
                setTimeout(updateFilters, 0);
              }}
              className="justify-start"
              size="sm"
            >
              {option.label}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );
};