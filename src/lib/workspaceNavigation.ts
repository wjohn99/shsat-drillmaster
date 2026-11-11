import { WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";

export const WORKSPACE_CARD_PARAM = "card";
/** When set to "card", open the card without jumping to comments. */
export const WORKSPACE_CARD_FOCUS_PARAM = "focus";

export function workspaceBoardPath(
  studentUid: string,
  cardId?: string | null,
  options?: { focusActivity?: boolean },
): string {
  const base = `${WORKSPACE_HOME_PATH}/${studentUid}`;
  const id = String(cardId || "").trim();
  if (!id) return base;
  const params = new URLSearchParams();
  params.set(WORKSPACE_CARD_PARAM, id);
  if (options?.focusActivity === false) {
    params.set(WORKSPACE_CARD_FOCUS_PARAM, "card");
  }
  return `${base}?${params.toString()}`;
}

export function parseWorkspaceCardParam(search: string): string | null {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const value = params.get(WORKSPACE_CARD_PARAM)?.trim();
  return value || null;
}

/** Email links open the card at the new comment. A plain return opens the card itself. */
export function workspaceCardFocusesActivity(search: string): boolean {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  return params.get(WORKSPACE_CARD_FOCUS_PARAM) !== "card";
}
