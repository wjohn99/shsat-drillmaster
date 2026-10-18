import type {
  WorkspaceBoardTemplate,
  WorkspaceBoardTemplateOption,
} from "@/lib/workspaceBoardTemplateTypes";
import {
  BLANK_WORKSPACE_BOARD_TEMPLATE_ID,
  DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID,
} from "@/lib/workspaceBoardTemplateTypes";
import shsatTemplate from "@/data/workspaceTemplates/shsat.json";

/** Register additional exam templates here as tutoring programs expand. */
export const WORKSPACE_BOARD_TEMPLATES: WorkspaceBoardTemplate[] = [
  shsatTemplate as WorkspaceBoardTemplate,
];

export const WORKSPACE_BOARD_TEMPLATE_OPTIONS: WorkspaceBoardTemplateOption[] = [
  {
    id: BLANK_WORKSPACE_BOARD_TEMPLATE_ID,
    label: "Blank",
    description: "Empty board. Add your own lists and cards.",
  },
  ...WORKSPACE_BOARD_TEMPLATES.map((template) => ({
    id: template.id,
    label: template.label,
    description: template.description,
  })),
];

export function getWorkspaceBoardTemplate(id: string): WorkspaceBoardTemplate | null {
  if (id === BLANK_WORKSPACE_BOARD_TEMPLATE_ID) return null;
  return WORKSPACE_BOARD_TEMPLATES.find((template) => template.id === id) ?? null;
}

export { BLANK_WORKSPACE_BOARD_TEMPLATE_ID, DEFAULT_WORKSPACE_BOARD_TEMPLATE_ID };
