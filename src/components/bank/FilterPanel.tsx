import { useEffect, useRef, useState } from "react";
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
import { Difficulty, FilterOptions, Subject } from "@/types";
import { QUESTION_FORMAT_TAGS, TAG_CATEGORIES } from "@/data/taggingScheme";

interface FilterPanelProps {
  totalCount: number;
  filteredCount: number;
  subjectCounts: Record<Subject, number>;
  onFiltersChange: (filters: Partial<FilterOptions>) => void;
}

export const FilterPanel = ({
  totalCount,
  filteredCount,
  subjectCounts,
  onFiltersChange,
}: FilterPanelProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedFormatTags, setSelectedFormatTags] = useState<string[]>([]);
  const [passageOnly, setPassageOnly] = useState(false);
  const [selectedUserStatus, setSelectedUserStatus] = useState<string[]>([]);
  const [tagSearchOpen, setTagSearchOpen] = useState(false);

  const subjects: Subject[] = ['MATH', 'ELA'];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];
  const userStatusOptions = [
    { value: 'attempted', label: 'Attempted' },
    { value: 'correct', label: 'Correct' },
    { value: 'bookmarked', label: 'Bookmarked' }
  ];

  const onFiltersChangeRef = useRef(onFiltersChange);
  onFiltersChangeRef.current = onFiltersChange;
  const lastSyncedFiltersRef = useRef("");

  useEffect(() => {
    const nextFilters: Partial<FilterOptions> = {
      subjects: selectedSubjects,
      difficulties: selectedDifficulties,
      tagCodes: selectedTags,
      formatTagCodes: selectedFormatTags,
      passageOnly,
      searchQuery,
      userStatus: selectedUserStatus,
    };
    const serialized = JSON.stringify(nextFilters);
    if (serialized === lastSyncedFiltersRef.current) {
      return;
    }

    const debounceMs = searchQuery.trim() ? 300 : 0;
    const timer = window.setTimeout(() => {
      lastSyncedFiltersRef.current = serialized;
      onFiltersChangeRef.current(nextFilters);
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [
    selectedSubjects,
    selectedDifficulties,
    selectedTags,
    selectedFormatTags,
    passageOnly,
    searchQuery,
    selectedUserStatus,
  ]);

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedSubjects([]);
    setSelectedDifficulties([]);
    setSelectedTags([]);
    setSelectedFormatTags([]);
    setPassageOnly(false);
    setSelectedUserStatus([]);
    lastSyncedFiltersRef.current = "";
  };

  const toggleArraySelection = <T,>(array: T[], setArray: (arr: T[]) => void, item: T) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };


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
            onChange={(e) => setSearchQuery(e.target.value)}
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
              variant={
                selectedSubjects.includes(subject)
                  ? "selected"
                  : subject === "MATH"
                    ? "math"
                    : "ela"
              }
              onClick={() =>
                toggleArraySelection(selectedSubjects, setSelectedSubjects, subject)
              }
              count={subjectCounts[subject]}
            >
              {subject}
            </Chip>
          ))}
        </div>
      </div>

      {/* Difficulty filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Difficulty</Label>
        <div className="flex gap-2">
          {difficulties.map((d) => {
            const label = d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard';
            const bg =
              d === 'easy'
                ? `hsl(var(--difficulty-easy))`
                : d === 'medium'
                  ? `hsl(var(--difficulty-medium))`
                  : `hsl(var(--difficulty-hard))`;
            return (
              <button
                key={d}
                onClick={() =>
                  toggleArraySelection(selectedDifficulties, setSelectedDifficulties, d)
                }
                className={`
                  flex-1 h-8 rounded-full text-xs font-semibold text-white transition-all
                  ${selectedDifficulties.includes(d) ? 'ring-2 ring-ring ring-offset-2' : 'hover:opacity-90'}
                `}
                style={{ backgroundColor: bg }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tags filter */}
      <div className="mb-6">
        <Label className="text-sm font-medium mb-3 block">Skill categories</Label>
        <Popover open={tagSearchOpen} onOpenChange={setTagSearchOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              {selectedTags.length === 0 ? "Select categories..." : `${selectedTags.length} selected`}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Search categories..." />
              <CommandList>
                <CommandEmpty>No categories found.</CommandEmpty>
                {TAG_CATEGORIES.filter((c) => c.id !== "indy").map((category) => (
                  <CommandGroup key={category.id} heading={category.title}>
                    {category.tags.map((tagDef) => (
                    <CommandItem
                      key={tagDef.code}
                      value={`${tagDef.label} ${tagDef.code}`}
                      onSelect={() =>
                        toggleArraySelection(selectedTags, setSelectedTags, tagDef.code)
                      }
                    >
                      <div className="flex items-center space-x-2 w-full">
                        <div
                          className={`h-3 w-3 rounded-sm border shrink-0 ${
                            selectedTags.includes(tagDef.code)
                              ? category.subject === "MATH"
                                ? "bg-math border-math"
                                : "bg-ela border-ela"
                              : "border-border"
                          }`}
                        />
                        <span className="text-sm">{tagDef.label}</span>
                      </div>
                    </CommandItem>
                    ))}
                  </CommandGroup>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        
        {/* Selected tags */}
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {selectedTags.map((tagCode) => {
              const category = TAG_CATEGORIES.find((c) =>
                c.tags.some((t) => t.code === tagCode),
              );
              const label =
                category?.tags.find((t) => t.code === tagCode)?.label ?? tagCode;
              return (
                <Chip
                  key={tagCode}
                  variant={category?.subject === "MATH" ? "math" : "ela"}
                  size="sm"
                  onRemove={() =>
                    setSelectedTags(selectedTags.filter((t) => t !== tagCode))
                  }
                >
                  {label}
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
        <p className="text-xs text-muted-foreground mb-3">
          Filter by how the question is presented (from the tagging scheme).
        </p>
        <div className="flex flex-col gap-2">
          {QUESTION_FORMAT_TAGS.map((formatTag) => (
            <Chip
              key={formatTag.code}
              variant={selectedFormatTags.includes(formatTag.code) ? "selected" : "secondary"}
              onClick={() =>
                toggleArraySelection(selectedFormatTags, setSelectedFormatTags, formatTag.code)
              }
              className="justify-start text-left h-auto min-h-7 py-1.5 whitespace-normal"
              size="sm"
            >
              {formatTag.label}
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
            onCheckedChange={setPassageOnly}
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
              onClick={() =>
                toggleArraySelection(selectedUserStatus, setSelectedUserStatus, option.value)
              }
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