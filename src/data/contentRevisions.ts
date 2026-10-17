/**
 * Audited content revisions (content/revisions/<track>/*.json).
 *
 * A revision is a complete replacement record for one ID in one track. Originals are never
 * edited: tracker/batch/diagnostic source files keep version 1, and the catalog overlays the
 * highest revision on top. Bank and diagnostic copies of the same ID are revised separately.
 */
import type { ContentTrack, Passage, Question } from "@/types";
import {
  hydratePassage,
  hydrateQuestion,
  type RawPassage,
  type RawQuestion,
} from "@/data/contentBatches";

export type RevisionChangeType = "feedback" | "substantive" | "scope-rewrite" | "metadata";

export type RawQuestionRevision = RawQuestion & {
  contentVersion: number;
  changeType: RevisionChangeType;
  auditFindings: string[];
  revisionNotes: string;
};

export type RawPassageRevision = RawPassage & {
  contentVersion: number;
  auditFindings: string[];
  revisionNotes: string;
};

export type RawRevisionFile = {
  track: ContentTrack;
  description?: string;
  questions?: RawQuestionRevision[];
  passages?: RawPassageRevision[];
};

const revisionModules = import.meta.glob("../../content/revisions/*/*.json", {
  eager: true,
}) as Record<string, RawRevisionFile | { default: RawRevisionFile }>;

function unwrap(mod: RawRevisionFile | { default: RawRevisionFile }): RawRevisionFile {
  return "default" in mod && mod.default ? mod.default : (mod as RawRevisionFile);
}

/** Every revision file with its path, for tests and reports. */
export function rawRevisionFiles(): { path: string; file: RawRevisionFile }[] {
  return Object.entries(revisionModules)
    .map(([path, mod]) => ({ path, file: unwrap(mod) }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function latestById<T extends { id: string; contentVersion: number }>(items: T[]): Map<string, T> {
  const byId = new Map<string, T>();
  for (const item of items) {
    const current = byId.get(item.id);
    if (!current || item.contentVersion > current.contentVersion) byId.set(item.id, item);
  }
  return byId;
}

export function rawQuestionRevisions(track: ContentTrack): RawQuestionRevision[] {
  return rawRevisionFiles()
    .filter(({ file }) => file.track === track)
    .flatMap(({ file }) => file.questions ?? []);
}

export function rawPassageRevisions(track: ContentTrack): RawPassageRevision[] {
  return rawRevisionFiles()
    .filter(({ file }) => file.track === track)
    .flatMap(({ file }) => file.passages ?? []);
}

/** Latest revision per question ID in a track. */
export function questionRevisions(track: ContentTrack): Map<string, Question> {
  const latest = latestById(rawQuestionRevisions(track));
  return new Map([...latest].map(([id, raw]) => [id, hydrateQuestion(raw)]));
}

/** Latest revision per passage ID in a track. */
export function passageRevisions(track: ContentTrack): Map<string, Passage> {
  const latest = latestById(rawPassageRevisions(track));
  return new Map([...latest].map(([id, raw]) => [id, hydratePassage(raw)]));
}

/** Replace records that have a revision; never adds IDs the source does not have. */
export function overlayRevisions<T extends { id: string }>(originals: T[], revisions: Map<string, T>): T[] {
  return originals.map((item) => revisions.get(item.id) ?? item);
}
