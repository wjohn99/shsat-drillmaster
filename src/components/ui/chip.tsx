import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

const chipVariants = cva(
  "inline-flex items-center rounded-full border text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-border bg-background text-foreground hover:bg-accent",
        secondary: "border-border bg-secondary text-secondary-foreground hover:bg-secondary/80",
        math: "border-math bg-math-secondary text-math-foreground hover:bg-math-secondary/80",
        ela: "border-ela bg-ela-secondary text-ela-foreground hover:bg-ela-secondary/80",
        difficulty: "border-border bg-background text-foreground",
        selected: "border-primary bg-primary text-primary-foreground hover:bg-primary/80",
      },
      size: {
        sm: "h-6 px-2 text-xs",
        default: "h-7 px-3 text-xs",
        lg: "h-8 px-4 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof chipVariants> {
  onRemove?: () => void;
  count?: number;
}

const Chip = React.forwardRef<HTMLButtonElement, ChipProps>(
  ({ className, variant, size, children, onRemove, count, ...props }, ref) => {
    return (
      <button
        className={cn(chipVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      >
        <span className="truncate">{children}</span>
        {count !== undefined && (
          <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.5 text-xs font-medium">
            {count}
          </span>
        )}
        {onRemove && (
          <X
            className="ml-1 h-3 w-3 cursor-pointer hover:text-foreground/70"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
          />
        )}
      </button>
    );
  }
);
Chip.displayName = "Chip";

export { Chip, chipVariants };