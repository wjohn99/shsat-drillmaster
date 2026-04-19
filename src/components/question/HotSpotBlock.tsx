import type { HsSpec } from "@/types";
import { cn, publicUrl } from "@/lib/utils";

export interface HotSpotBlockProps {
  spec: HsSpec;
  selectedId: string | null;
  onSelect: (spotId: string) => void;
  disabled?: boolean;
  showSolution?: boolean;
}

export function HotSpotBlock({
  spec,
  selectedId,
  onSelect,
  disabled = false,
  showSolution = false,
}: HotSpotBlockProps) {
  const { imageSrc, imageAlt = "Question image", spots } = spec;

  return (
    <div className="space-y-3">
      {spec.instruction ? (
        <p className="text-sm text-muted-foreground">{spec.instruction}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          Click the correct region on the image.
        </p>
      )}
      <div className="relative inline-block max-w-full overflow-hidden rounded-md border border-border bg-muted/30">
        <img
          src={publicUrl(imageSrc)}
          alt={imageAlt}
          className="block h-auto max-h-[min(420px,70vh)] w-full max-w-2xl object-contain"
          draggable={false}
        />
        <div className="absolute inset-0">
          {spots.map((spot) => {
            const isSelected = selectedId === spot.id;
            const isCorrect = spot.id === correctSpotId;
            const showWrongPick = showSolution && isSelected && !isCorrect;
            const showCorrect = showSolution && isCorrect;

            return (
              <button
                key={spot.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelect(spot.id)}
                className={cn(
                  "absolute box-border rounded-sm border-2 border-transparent transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  !disabled && "hover:bg-primary/15",
                  !showSolution && isSelected && "border-primary bg-primary/10",
                  showCorrect && "border-success bg-success/20",
                  showWrongPick && "border-destructive bg-destructive/15"
                )}
                style={{
                  left: `${spot.left}%`,
                  top: `${spot.top}%`,
                  width: `${spot.width}%`,
                  height: `${spot.height}%`,
                }}
                aria-label={`Region ${spot.id}`}
                aria-pressed={isSelected}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
