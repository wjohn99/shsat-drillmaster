/** Fall 2026 NYC SHSAT (admission to specialized high schools in September 2027). */
export const SHSAT_2026_PLAN = {
  admissionsYear: 2027,
  testSeason: "Fall 2026",
  /** NYC public middle-school School Day. Charter/private dates may differ. */
  schoolDayDate: "2026-11-18",
  registrationOpens: "2026-10-06",
  registrationCloses: "2026-10-30",
  elaCount: 50,
  mathCount: 50,
  standardMinutes: 180,
  format:
    "Computer-adaptive. 50 ELA + 50 Math, 180 minutes. Score is a scaled composite, not raw percent.",
} as const;

export type ShsatTargetSchoolId =
  | "undecided"
  | "stuyvesant"
  | "hsmse"
  | "queens-sciences"
  | "bronx-science"
  | "staten-island-tech"
  | "hsas-lehman"
  | "brooklyn-tech"
  | "brooklyn-latin";

/** Prior-cycle published composites (2026 entry). Fall 2026 exam cutoffs are not out yet. */
export const SHSAT_TARGET_SCHOOLS: Array<{
  id: ShsatTargetSchoolId;
  label: string;
  priorCutoff: number | null;
}> = [
  { id: "undecided", label: "Undecided / several schools", priorCutoff: null },
  { id: "stuyvesant", label: "Stuyvesant", priorCutoff: 561 },
  { id: "hsmse", label: "HSMSE at City College", priorCutoff: 539 },
  { id: "queens-sciences", label: "Queens High School for the Sciences", priorCutoff: 531 },
  { id: "bronx-science", label: "Bronx Science", priorCutoff: 525 },
  { id: "staten-island-tech", label: "Staten Island Tech", priorCutoff: 517 },
  { id: "hsas-lehman", label: "HSAS at Lehman College", priorCutoff: 507 },
  { id: "brooklyn-tech", label: "Brooklyn Tech", priorCutoff: 506 },
  { id: "brooklyn-latin", label: "Brooklyn Latin", priorCutoff: 495 },
];

export function shsatSchoolById(id: string | null | undefined) {
  return SHSAT_TARGET_SCHOOLS.find((school) => school.id === id) ?? SHSAT_TARGET_SCHOOLS[0];
}

export function formatIsoDateLabel(isoDate: string | null | undefined): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return isoDate;
  const [year, month, day] = parts;
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function daysUntilIsoDate(isoDate: string | null | undefined, now = Date.now()): number | null {
  if (!isoDate) return null;
  const parts = isoDate.split("-").map(Number);
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return null;
  const [year, month, day] = parts;
  const target = new Date(year, month - 1, day);
  target.setHours(0, 0, 0, 0);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}
