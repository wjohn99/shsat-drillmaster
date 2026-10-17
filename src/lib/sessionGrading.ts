import type { Question } from "@/types";
import { isIndyCheckboxMultiSubtype, isAtaAnswerCorrect, parseAtaAnswer } from "@/lib/indyAta";
import { parseDndPlacementsForQuestion, allDndZonesFilled, isDndPlacementCorrect } from "@/lib/indyDnd";
import { parseIcSelectionsForQuestion, allIcSlotsFilled, isIcSelectionCorrect } from "@/lib/indyIc";
import { isEeAnswerCorrect } from "@/lib/indyEe";
import { isHsAnswerCorrect } from "@/lib/indyHs";
import { isGifAnswerCorrect } from "@/lib/indyGif";

export function canSubmitQuestionAnswer(q: Question, raw: string | undefined): boolean {
  if (q.subtype === "INDY-DND" && q.dnd) {
    const placements = parseDndPlacementsForQuestion(q.dnd, raw);
    return allDndZonesFilled(q.dnd, placements);
  }
  if (q.subtype === "INDY-IC" && q.ic) {
    const selections = parseIcSelectionsForQuestion(q.ic, raw);
    return allIcSlotsFilled(q.ic, selections);
  }
  if (q.subtype === "INDY-EE" && q.ee) return (raw ?? "").trim() !== "";
  if (isNumericEntryWithoutChoices(q)) return (raw ?? "").trim() !== "";
  if (q.subtype === "INDY-HS") return Boolean(raw);
  if (q.subtype === "INDY-GIF") return Boolean(raw);
  if (isIndyCheckboxMultiSubtype(q.subtype)) return parseAtaAnswer(raw).length > 0;
  if (q.subtype === "GRID_IN") return (raw ?? "").trim() !== "";
  return Boolean(raw);
}

/**
 * Numeric entry carried by another subtype, e.g. an INDY-CGT table question answered with
 * an `ee` spec and no choices. Without this it fell through to the choice check and could
 * never be scored correct.
 */
function isNumericEntryWithoutChoices(q: Question): boolean {
  return Boolean(q.ee) && !q.choices?.length;
}

export function isQuestionAnswerCorrect(q: Question, raw: string | undefined): boolean {
  if (q.subtype === "INDY-EE" && q.ee) return isEeAnswerCorrect(q.ee, raw ?? "");
  if (isNumericEntryWithoutChoices(q)) return isEeAnswerCorrect(q.ee, raw ?? "");
  if (q.subtype === "INDY-DND" && q.dnd) {
    const placements = parseDndPlacementsForQuestion(q.dnd, raw);
    return isDndPlacementCorrect(q.dnd, placements);
  }
  if (q.subtype === "INDY-IC" && q.ic) {
    const selections = parseIcSelectionsForQuestion(q.ic, raw);
    return isIcSelectionCorrect(q.ic, selections);
  }
  if (q.subtype === "INDY-HS" && q.hs) return isHsAnswerCorrect(raw ?? null, q.hs.correctSpotId);
  if (q.subtype === "INDY-GIF" && q.gif) return isGifAnswerCorrect(q.gif, raw ?? "");

  if (isIndyCheckboxMultiSubtype(q.subtype) && q.choices) {
    return isAtaAnswerCorrect(q.choices, parseAtaAnswer(raw));
  }

  if (q.choices?.length) {
    const picked = raw;
    const correct = q.choices.find((c) => c.isCorrect);
    return Boolean(correct && picked && picked === correct.id);
  }

  if (q.subtype === "GRID_IN") {
    // No answer key in current dataset — treat as not gradable for correctness.
    return false;
  }

  return false;
}
