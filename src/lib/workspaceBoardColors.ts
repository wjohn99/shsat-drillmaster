/** Preset swatches when creating a student workspace board. */
export const WORKSPACE_BOARD_COLORS = [
  { id: "navy", label: "Navy", hex: "#1e3a8a" },
  { id: "sky", label: "Sky", hex: "#0ea5e9" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "magenta", label: "Magenta", hex: "#a21caf" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
  { id: "orange", label: "Orange", hex: "#ea580c" },
  { id: "amber", label: "Amber", hex: "#f59e0b" },
  { id: "lime", label: "Lime", hex: "#84cc16" },
  { id: "emerald", label: "Emerald", hex: "#10b981" },
] as const;

/** Sky, the most used existing board color. */
export const DEFAULT_WORKSPACE_BOARD_COLOR = "#0ea5e9";

export function workspaceBoardAccentColor(color?: string | null): string {
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return DEFAULT_WORKSPACE_BOARD_COLOR;
}
