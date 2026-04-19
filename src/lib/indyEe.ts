import type { EeSpec } from "@/types";

export function normalizeEeInput(raw: string): string {
  return raw.replace(/\$/g, "").replace(/,/g, "").trim();
}

function tryParseNum(s: string): number | null {
  const t = normalizeEeInput(s).replace(/%/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Compare user entry to acceptable forms; treats numeric strings as equal within float tolerance. */
export function isEeAnswerCorrect(spec: EeSpec, raw: string): boolean {
  const user = normalizeEeInput(raw);
  if (!user) return false;
  for (const acc of spec.acceptableAnswers) {
    const a = normalizeEeInput(acc);
    const nu = tryParseNum(user);
    const na = tryParseNum(a);
    if (nu !== null && na !== null && Math.abs(nu - na) < 1e-6) return true;
    if (user.toLowerCase() === a.toLowerCase()) return true;
  }
  return false;
}
