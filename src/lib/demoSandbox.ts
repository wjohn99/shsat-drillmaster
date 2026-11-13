import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import {
  DEMO_SAMPLE_HOMEWORK_ATTACHMENT_ID,
  DEMO_SAMPLE_HOMEWORK_CARD_DESCRIPTION,
  DEMO_SAMPLE_HOMEWORK_CARD_ID,
  DEMO_SAMPLE_HOMEWORK_CARD_TITLE,
  DEMO_SAMPLE_HOMEWORK_LINK_NAME,
  DEMO_SAMPLE_HOMEWORK_URL,
} from "@/lib/demoHomework";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";
import { serializeStudentRoadmap } from "@/lib/studentRoadmap";
import type { StudentOption } from "@/types/assignment";
import type { StudentRoadmap, WorkspaceBoard } from "@/types/workspace";
import { fetchDemoOwnedBoards } from "@/lib/workspaceService";

const BOARDS_COLLECTION = "workspace_boards";

type DemoListKind = "custom" | "sessions" | "tests";

interface DemoCardSeed {
  title: string;
  description: string;
  sessionDate?: string;
  startTime?: string;
}

interface DemoListSeed {
  title: string;
  kind: DemoListKind;
  cards: DemoCardSeed[];
}

interface DemoTutorNoteSeed {
  kind: "lesson_plan" | "session_notes" | "observation" | "next_session";
  title: string;
  sessionDate: string;
  body: string;
}

interface DemoStudentSeed {
  slug: string;
  displayName: string;
  email: string;
  color: string;
  diagnosticAssigned: boolean;
  roadmap: StudentRoadmap;
  lists: DemoListSeed[];
  tutorNotes?: DemoTutorNoteSeed[];
}

function sampleRoadmap(partial: Partial<StudentRoadmap>): StudentRoadmap {
  return {
    startingPoint: "",
    currentScores: "",
    targetComposite: null,
    targetSchool: "undecided",
    testDate: "",
    currentPriority: "",
    longTermPriorities: "",
    strengthsNotes: "",
    growthNotes: "",
    nextSessionDate: "",
    nextSessionTime: "",
    nextSessionNotes: "",
    followUps: [],
    progressUpdates: [],
    status: null,
    statusManual: true,
    ...partial,
  };
}

const DEMO_STUDENTS: DemoStudentSeed[] = [
  {
    slug: "avery",
    displayName: "Avery Chen",
    email: "avery.chen.sample@example.com",
    color: "#0ea5e9",
    diagnosticAssigned: true,
    roadmap: sampleRoadmap({
      startingPoint: "Sample baseline from a full practice form, 42% overall.",
      currentScores: "Latest sample sitting, 51% overall. Math is ahead of ELA.",
      targetComposite: 530,
      targetSchool: "brooklyn-tech",
      testDate: "2026-11-18",
      currentPriority: "Reading evidence and linear equations.",
      longTermPriorities: "Steady weekly homework, then a full timed form once a week.",
      strengthsNotes: "Careful with arithmetic. Shows work on most math items.",
      growthNotes: "Rushes reading questions and misses the line that answers them.",
      nextSessionDate: "2026-10-22",
      nextSessionTime: "16:00",
      nextSessionNotes: "Review the homework worksheet, then a short reading set.",
      followUps: [
        {
          id: "avery-follow-1",
          text: "Finish the assigned worksheet before Thursday.",
          open: true,
          createdAtMs: Date.UTC(2026, 9, 18),
        },
      ],
      progressUpdates: [
        {
          id: "avery-update-1",
          date: "2026-10-19",
          changed:
            "Avery finished the sample algebra worksheet. Linear items were stronger than the long passage. Next is a short reading set on Session 2 before Thursday.",
          next: "",
          cardId: null,
          cardTitle: null,
          createdByUid: "demo-tutor",
          createdByName: "Sample tutor",
          createdAtMs: Date.UTC(2026, 9, 19, 20, 0),
        },
      ],
      status: "active_work",
      statusManual: true,
    }),
    lists: [
      {
        title: "Homework",
        kind: "custom",
        cards: [
          {
            title: "Oct 19 homework",
            description:
              "Sample assignment. 12 mixed math items, plus one reading passage. Due before the next session.",
          },
        ],
      },
      {
        title: "Session summaries",
        kind: "sessions",
        cards: [
          {
            title: "10.12.26 Session 2",
            description:
              "Worked linear equations and one reading passage. Avery can set up the equation, then loses the question when the passage is long.",
            sessionDate: "2026-10-12",
            startTime: "16:00",
          },
          {
            title: "10.05.26 Session 1",
            description:
              "Intro session. Timed a short math set and talked through how to mark evidence in a passage.",
            sessionDate: "2026-10-05",
            startTime: "16:00",
          },
        ],
      },
      {
        title: "Score reports",
        kind: "tests",
        cards: [
          {
            title: "Sample diagnostic",
            description: "Date: Oct 2\nMath: 28/50\nELA: 14/50\nThis is filler, not a real score report.",
          },
        ],
      },
    ],
    tutorNotes: [
      {
        kind: "lesson_plan",
        title: "Oct 21 sample lesson plan",
        sessionDate: "2026-10-21",
        body: "Private to tutors. Warm-up on linear equations, then one reading passage. Homework stays on the family-facing list below.",
      },
    ],
  },
  {
    slug: "jordan",
    displayName: "Jordan Patel",
    email: "jordan.patel.sample@example.com",
    color: "#10b981",
    diagnosticAssigned: true,
    roadmap: sampleRoadmap({
      startingPoint: "Sample baseline, 61% overall. Math is the stronger section.",
      currentScores: "Reading accuracy on recent sets is about 55%.",
      targetComposite: 560,
      targetSchool: "stuyvesant",
      testDate: "2026-11-18",
      currentPriority: "Main idea and inference questions.",
      longTermPriorities: "Keep math review light and spend most sessions on reading.",
      strengthsNotes: "Algebra is solid. Checks the answer against the question.",
      growthNotes: "Picks an answer that is true in the passage but does not answer the question.",
      nextSessionDate: "2026-10-23",
      nextSessionTime: "17:30",
      nextSessionNotes: "One reading passage, then go over the misses together.",
      followUps: [
        {
          id: "jordan-follow-1",
          text: "Send the parent the sample score summary.",
          open: true,
          createdAtMs: Date.UTC(2026, 9, 16),
        },
      ],
      status: "next_session",
      statusManual: true,
    }),
    lists: [
      {
        title: "Homework",
        kind: "custom",
        cards: [
          {
            title: "Reading set",
            description: "Sample homework. Two passages, questions only, no timer.",
          },
        ],
      },
      {
        title: "Session summaries",
        kind: "sessions",
        cards: [
          {
            title: "10.16.26 Session 4",
            description:
              "Inference questions. Jordan can find the right paragraph and still picks a detail that does not answer the stem.",
            sessionDate: "2026-10-16",
            startTime: "17:30",
          },
        ],
      },
      {
        title: "Score reports",
        kind: "tests",
        cards: [
          {
            title: "Sample practice form",
            description: "Date: Oct 9\nMath: 38/50\nELA: 24/50\nThis is filler, not a real score report.",
          },
        ],
      },
    ],
  },
  {
    slug: "sam",
    displayName: "Sam Rivera",
    email: "sam.rivera.sample@example.com",
    color: "#f59e0b",
    diagnosticAssigned: false,
    roadmap: sampleRoadmap({
      startingPoint: "New sample student. No full form yet.",
      currentScores: "",
      targetSchool: "undecided",
      currentPriority: "Get a baseline, then set a weekly homework habit.",
      longTermPriorities: "Choose a target school after the first diagnostic.",
      strengthsNotes: "",
      growthNotes: "",
      nextSessionDate: "2026-10-24",
      nextSessionTime: "15:00",
      nextSessionNotes: "First working session. Leave notes on the session card.",
      followUps: [
        {
          id: "sam-follow-1",
          text: "Assign the diagnostic before the next session.",
          open: true,
          createdAtMs: Date.UTC(2026, 9, 20),
        },
      ],
      status: "follow_up",
      statusManual: true,
    }),
    lists: [
      {
        title: "Homework",
        kind: "custom",
        cards: [
          {
            title: "Add this week's homework",
            description: "Sample card. Replace this note with the work you want Sam to do.",
          },
        ],
      },
      {
        title: "Session summaries",
        kind: "sessions",
        cards: [
          {
            title: "Session notes",
            description: "Name:\nDate:\nStart time:\nWhat you worked on:",
            sessionDate: "2026-10-24",
            startTime: "15:00",
          },
        ],
      },
      {
        title: "Score reports",
        kind: "tests",
        cards: [
          {
            title: "Diagnostic",
            description: "Date:\nMath:\nELA:\nAdd the score after the first sitting.",
          },
        ],
      },
    ],
  },
];

export function demoSandboxBoardId(ownerUid: string, slug: string): string {
  return `demo-${ownerUid}-${slug}`;
}

export function isDemoSandboxStudentUid(ownerUid: string, studentUid: string): boolean {
  return studentUid.startsWith(`demo-${ownerUid}-`);
}

function studentsFromBoards(boards: WorkspaceBoard[]): StudentOption[] {
  return boards
    .map((board) => ({
      uid: board.studentUid,
      displayName: board.studentName,
      email: board.studentEmail,
    }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
}

async function boardHasLists(boardId: string): Promise<boolean> {
  const snapshot = await getDocs(
    query(collection(getFirebaseDb(), BOARDS_COLLECTION, boardId, "lists")),
  );
  return snapshot.docs.some((listDoc) => !listDoc.data().deletedAt);
}

async function boardHasTutorNotes(boardId: string): Promise<boolean> {
  const snapshot = await getDocs(
    collection(getFirebaseDb(), BOARDS_COLLECTION, boardId, "tutor_private"),
  );
  return snapshot.docs.some((noteDoc) => !noteDoc.data().deletedAt);
}

async function writeTutorNotes(
  ownerUid: string,
  boardId: string,
  notes: DemoTutorNoteSeed[],
): Promise<void> {
  if (notes.length === 0) return;
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  const now = Timestamp.now();
  notes.forEach((note) => {
    const noteRef = doc(collection(db, BOARDS_COLLECTION, boardId, "tutor_private"));
    batch.set(noteRef, {
      kind: note.kind,
      title: note.title,
      sessionDate: note.sessionDate,
      body: note.body,
      files: [],
      createdByUid: ownerUid,
      createdByName: "Demo tutor",
      createdAt: now,
      updatedAt: now,
    });
  });
  await batch.commit();
}

async function writeBoardContents(ownerUid: string, seed: DemoStudentSeed): Promise<void> {
  const db = getFirebaseDb();
  const boardId = demoSandboxBoardId(ownerUid, seed.slug);
  const batch = writeBatch(db);

  seed.lists.forEach((list, listIndex) => {
    const listRef = doc(collection(db, BOARDS_COLLECTION, boardId, "lists"));
    batch.set(listRef, {
      title: list.title,
      kind: list.kind,
      position: listIndex,
      createdAt: Timestamp.now(),
    });
    list.cards.forEach((card, cardIndex) => {
      const cardRef = doc(collection(db, BOARDS_COLLECTION, boardId, "cards"));
      batch.set(cardRef, {
        listId: listRef.id,
        title: card.title,
        description: card.description,
        ...(card.sessionDate
          ? {
              sessionMeta: {
                sessionDate: card.sessionDate,
                ...(card.startTime ? { startTime: card.startTime } : {}),
              },
            }
          : {}),
        position: cardIndex,
        completed: false,
        commentCount: 0,
        attachmentCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    });
  });

  await batch.commit();
}

/** Sample class for a demo tutor. Creates the boards once, then returns them. */
export async function ensureDemoSandbox(ownerUid: string): Promise<WorkspaceBoard[]> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user || user.uid !== ownerUid) {
    throw new Error("You must be signed in to open the demo class.");
  }

  const existing = await fetchDemoOwnedBoards(ownerUid);
  const have = new Set(existing.map((board) => board.id));
  const db = getFirebaseDb();
  const tutorName = (user.displayName || user.email || "Tutor").slice(0, 200);

  for (const seed of DEMO_STUDENTS) {
    const boardId = demoSandboxBoardId(ownerUid, seed.slug);
    if (!have.has(boardId)) {
      const now = Timestamp.now();
      await setDoc(doc(db, BOARDS_COLLECTION, boardId), {
        studentUid: boardId,
        studentName: seed.displayName,
        studentEmail: seed.email,
        color: seed.color,
        createdByUid: ownerUid,
        assignedTutorUid: ownerUid,
        assignedTutorName: tutorName,
        assignedTutorEmail: user.email || "",
        demoAccount: true,
        demoOwnerUid: ownerUid,
        diagnosticAssigned: seed.diagnosticAssigned,
        createdAt: now,
        roadmap: {
          ...serializeStudentRoadmap(seed.roadmap),
          diagnosticAssigned: seed.diagnosticAssigned,
        },
        roadmapUpdatedAt: now,
        updatedAt: now,
      });
    }
    if (!(await boardHasLists(boardId))) {
      await writeBoardContents(ownerUid, seed);
    }
    if (seed.tutorNotes?.length && !(await boardHasTutorNotes(boardId))) {
      await writeTutorNotes(ownerUid, boardId, seed.tutorNotes);
    }
  }

  await ensureDemoSampleHomework(ownerUid, tutorName);

  return fetchDemoOwnedBoards(ownerUid);
}

async function ensureDemoSampleHomework(ownerUid: string, uploaderName: string): Promise<void> {
  const boardId = demoSandboxBoardId(ownerUid, "avery");
  const db = getFirebaseDb();
  const boardSnap = await getDoc(doc(db, BOARDS_COLLECTION, boardId));
  if (!boardSnap.exists()) return;

  const cardsSnap = await getDocs(collection(db, BOARDS_COLLECTION, boardId, "cards"));
  const titled = cardsSnap.docs.filter(
    (cardDoc) => cardDoc.data().title === DEMO_SAMPLE_HOMEWORK_CARD_TITLE,
  );
  const activeCard = titled.find((cardDoc) => !cardDoc.data().deletedAt);
  if (!activeCard && titled.length > 0) return;

  let cardId = activeCard?.id;
  if (!cardId) {
    const listsSnap = await getDocs(collection(db, BOARDS_COLLECTION, boardId, "lists"));
    const homework = listsSnap.docs.find((listDoc) => {
      const data = listDoc.data();
      return !data.deletedAt && String(data.title || "").trim().toLowerCase() === "homework";
    });
    let listId = homework?.id;
    if (!listId) {
      const listRef = doc(collection(db, BOARDS_COLLECTION, boardId, "lists"));
      const positions = listsSnap.docs.map((listDoc) => Number(listDoc.data().position) || 0);
      await setDoc(listRef, {
        title: "Homework",
        kind: "custom",
        position: positions.length ? Math.max(...positions) + 1 : 0,
        createdAt: Timestamp.now(),
      });
      listId = listRef.id;
    }

    const stableRef = doc(db, BOARDS_COLLECTION, boardId, "cards", DEMO_SAMPLE_HOMEWORK_CARD_ID);
    const stableSnap = await getDoc(stableRef);
    const cardRef =
      stableSnap.exists() && stableSnap.data().title !== DEMO_SAMPLE_HOMEWORK_CARD_TITLE
        ? doc(collection(db, BOARDS_COLLECTION, boardId, "cards"))
        : stableRef;
    if (stableSnap.exists() && stableSnap.data().deletedAt && cardRef.id === stableRef.id) return;

    const cardPositions = cardsSnap.docs
      .filter((cardDoc) => cardDoc.data().listId === listId && !cardDoc.data().deletedAt)
      .map((cardDoc) => Number(cardDoc.data().position) || 0);
    if (!stableSnap.exists() || cardRef.id !== stableRef.id) {
      await setDoc(cardRef, {
        listId,
        title: DEMO_SAMPLE_HOMEWORK_CARD_TITLE,
        description: DEMO_SAMPLE_HOMEWORK_CARD_DESCRIPTION,
        position: cardPositions.length ? Math.max(...cardPositions) + 1 : 0,
        completed: false,
        commentCount: 0,
        attachmentCount: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
    }
    cardId = cardRef.id;
  }

  const attachmentRef = doc(
    db,
    BOARDS_COLLECTION,
    boardId,
    "cards",
    cardId,
    "attachments",
    DEMO_SAMPLE_HOMEWORK_ATTACHMENT_ID,
  );
  const attachmentSnap = await getDoc(attachmentRef);
  if (attachmentSnap.exists()) return;

  const user = getFirebaseAuth().currentUser;
  if (!user) return;
  await setDoc(attachmentRef, {
    kind: "link",
    fileName: DEMO_SAMPLE_HOMEWORK_LINK_NAME,
    externalUrl: DEMO_SAMPLE_HOMEWORK_URL,
    contentType: "text/link",
    sizeBytes: 0,
    uploadedByUid: user.uid,
    uploadedByName: uploaderName.slice(0, 200) || "Tutor",
    createdAt: Timestamp.now(),
  });
  await updateDoc(doc(db, BOARDS_COLLECTION, boardId, "cards", cardId), {
    attachmentCount: increment(1),
    updatedAt: Timestamp.now(),
  });
}

export async function fetchDemoStudents(ownerUid: string): Promise<StudentOption[]> {
  const boards = await ensureDemoSandbox(ownerUid);
  return studentsFromBoards(boards);
}
