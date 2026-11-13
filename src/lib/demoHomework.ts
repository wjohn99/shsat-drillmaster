/** Stored on the sample card. Resolved in the browser so localhost and the live site both open. */
export const DEMO_SAMPLE_HOMEWORK_URL = "drillmaster-demo:sample-homework";

export const DEMO_SAMPLE_HOMEWORK_CARD_ID = "sample-homework";
export const DEMO_SAMPLE_HOMEWORK_ATTACHMENT_ID = "sample-homework-link";
export const DEMO_SAMPLE_HOMEWORK_CARD_TITLE = "Sample homework page";
export const DEMO_SAMPLE_HOMEWORK_LINK_NAME = "Open sample homework";
export const DEMO_SAMPLE_HOMEWORK_CARD_DESCRIPTION =
  "Open this card and click Open sample homework. Fill it in and press Submit, the same way a student turns in homework. Submit sends a real homework response labeled as a demo, so it can be deleted.";

export function resolveDemoHomeworkLink(url: string): string {
  if (url !== DEMO_SAMPLE_HOMEWORK_URL) return url;
  const base = import.meta.env.BASE_URL || "/";
  const prefix = base.endsWith("/") ? base : `${base}/`;
  const path = `${prefix}demo/sample-homework.html`;
  if (typeof window === "undefined") return path;
  return new URL(path, window.location.origin).href;
}
