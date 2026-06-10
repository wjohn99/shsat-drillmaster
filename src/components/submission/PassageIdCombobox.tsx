import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface PassageIdComboboxProps {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function PassageIdCombobox({
  value,
  options,
  onChange,
  placeholder = "e.g. RC-PASS-001",
  disabled = false,
}: PassageIdComboboxProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (id: string) => {
    onChange(id);
    setOpen(false);
  };

  return (
    <div className="flex gap-2">
      <Input
        id="passage-id"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1 font-mono text-sm"
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            aria-label="Select saved passage ID"
            className="shrink-0"
          >
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="end">
          <Command>
            <CommandInput placeholder="Search saved IDs..." />
            <CommandList>
              <CommandEmpty>No saved passage IDs yet.</CommandEmpty>
              <CommandGroup>
                {options.map((id) => (
                  <CommandItem
                    key={id}
                    value={id}
                    onSelect={() => handleSelect(id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="font-mono text-sm">{id}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
