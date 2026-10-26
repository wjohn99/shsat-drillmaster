import { WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";

export const WORKSPACE_CARD_PARAM = "card";

export function workspaceBoardPath(studentUid: string, cardId?: string | null): string {
  const base = `${WORKSPACE_HOME_PATH}/${studentUid}`;
  const id = String(cardId || "").trim();
  if (!id) return base;
  return `${base}?${WORKSPACE_CARD_PARAM}=${encodeURIComponent(id)}`;
}

export function parseWorkspaceCardParam(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get(WORKSPACE_CARD_PARAM)?.trim();
  return value || null;
}
