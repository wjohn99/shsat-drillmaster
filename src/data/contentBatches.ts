import type { Passage, Question, QuestionModule, QuestionSubtype, Subject } from "@/types";
import { tag } from "@/data/taggingScheme";

type RawTag = string | { code: string };

export type RawQuestion = {
  id: string;
  subject: Subject;
  module: QuestionModule;
  subtype: QuestionSubtype;
  stem: string;
  tags?: RawTag[];
  choices?: Question["choices"];
  dnd?: Question["dnd"];
  ee?: Question["ee"];
  cgt?: Question["cgt"];
  wp?: Question["wp"];
  ic?: Question["ic"];
  ms?: Question["ms"];
  hs?: Question["hs"];
  gif?: Question["gif"];
  passageId?: string;
  timeToSolve?: number;
  commonTrap?: string;
  solutionExplanation?: string;
  createdAt?: string;
  reviewStatus?: Question["reviewStatus"];
  contentVersion?: number;
};

export type RawPassage = {
  id: string;
  title: string;
  lexile?: number;
  sourceMeta?: string;
  body: string;
  contentVersion?: number;
};

type RawBatch = {
  questions?: RawQuestion[];
  passages?: RawPassage[];
};

/** Same suggested time as Jed Approved tracker items (shown as 2:00 in the bank). */
const DEFAULT_TIME_TO_SOLVE_SECONDS = 120;

const batchModules = import.meta.glob("../../content/batches/*/questions.json", {
  eager: true,
}) as Record<string, RawBatch | { default: RawBatch }>;

function unwrapBatch(mod: RawBatch | { default: RawBatch }): RawBatch {
  return "default" in mod && mod.default ? mod.default : (mod as RawBatch);
}

function hydrateTags(rawTags: RawTag[] | undefined): Question["tags"] {
  return (rawTags ?? []).map((item) => {
    const code = typeof item === "string" ? item : item.code;
    return tag(code);
  });
}

export function hydrateQuestion(raw: RawQuestion): Question {
  return {
    id: raw.id,
    subject: raw.subject,
    module: raw.module,
    subtype: raw.subtype,
    stem: raw.stem,
    commonTrap: raw.commonTrap,
    solutionExplanation: raw.solutionExplanation,
    choices: raw.choices,
    dnd: raw.dnd,
    ee: raw.ee,
    cgt: raw.cgt,
    wp: raw.wp,
    ic: raw.ic,
    ms: raw.ms,
    hs: raw.hs,
    gif: raw.gif,
    tags: hydrateTags(raw.tags),
    passageId: raw.passageId,
    timeToSolve: raw.timeToSolve && raw.timeToSolve > 0 ? raw.timeToSolve : DEFAULT_TIME_TO_SOLVE_SECONDS,
    createdAt: raw.createdAt ?? new Date().toISOString(),
    reviewStatus: raw.reviewStatus === "final" ? "final" : "provisional",
    contentVersion: raw.contentVersion && raw.contentVersion > 1 ? raw.contentVersion : 1,
  };
}

export function hydratePassage(raw: RawPassage): Passage {
  return {
    id: raw.id,
    title: raw.title,
    lexile: raw.lexile,
    sourceMeta: raw.sourceMeta,
    body: raw.body,
    questions: [],
    contentVersion: raw.contentVersion && raw.contentVersion > 1 ? raw.contentVersion : 1,
  };
}

/** All content batch JSON files. Duplicate IDs keep the last file. */
export function loadContentBatches(): { questions: Question[]; passages: Passage[] } {
  const questionsById = new Map<string, Question>();
  const passagesById = new Map<string, Passage>();

  for (const batch of Object.values(batchModules).map(unwrapBatch)) {
    for (const passage of batch.passages ?? []) {
      if (!passagesById.has(passage.id)) {
        passagesById.set(passage.id, hydratePassage(passage));
      }
    }
    for (const question of batch.questions ?? []) {
      questionsById.set(question.id, hydrateQuestion(question));
    }
  }

  return {
    questions: [...questionsById.values()],
    passages: [...passagesById.values()],
  };
}
