/** Preset swatches when creating a student workspace board. */
export const WORKSPACE_BOARD_COLORS = [
  { id: "sky", label: "Sky", hex: "#0ea5e9" },
  { id: "indigo", label: "Indigo", hex: "#6366f1" },
  { id: "violet", label: "Violet", hex: "#8b5cf6" },
  { id: "rose", label: "Rose", hex: "#f43f5e" },
  { id: "amber", label: "Amber", hex: "#f59e0b" },
  { id: "emerald", label: "Emerald", hex: "#10b981" },
  { id: "teal", label: "Teal", hex: "#14b8a6" },
  { id: "slate", label: "Slate", hex: "#64748b" },
] as const;

export const DEFAULT_WORKSPACE_BOARD_COLOR = WORKSPACE_BOARD_COLORS[0].hex;

export function workspaceBoardAccentColor(color?: string | null): string {
  if (color && /^#[0-9a-fA-F]{6}$/.test(color)) {
    return color;
  }
  return DEFAULT_WORKSPACE_BOARD_COLOR;
}
