import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFirebaseDb, getFirebaseStorage } from "@/lib/firebase";

type TutorSourceFile = {
  fileName: string;
  storagePath: string;
};

type TutorPrivateNotes = {
  body: string;
  files: TutorSourceFile[];
};

function parseNotes(raw: unknown): TutorPrivateNotes | null {
  if (!raw || typeof raw !== "object") return null;
  const data = raw as { body?: unknown; files?: unknown };
  const body = typeof data.body === "string" ? data.body.trim() : "";
  const files = Array.isArray(data.files)
    ? data.files.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as { fileName?: unknown; storagePath?: unknown };
        if (typeof row.fileName !== "string" || typeof row.storagePath !== "string") return [];
        if (!row.fileName || !row.storagePath) return [];
        return [{ fileName: row.fileName, storagePath: row.storagePath }];
      })
    : [];
  if (!body && files.length === 0) return null;
  return { body, files };
}

export function TutorPrivatePanel({ boardId }: { boardId: string }) {
  const [notes, setNotes] = useState<TutorPrivateNotes | null>(null);
  const [loading, setLoading] = useState(true);
  const [openingPath, setOpeningPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDoc(doc(getFirebaseDb(), "workspace_boards", boardId, "tutor_private", "notes"))
      .then((snapshot) => {
        if (cancelled) return;
        setNotes(snapshot.exists() ? parseNotes(snapshot.data()) : null);
      })
      .catch(() => {
        if (!cancelled) setNotes(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [boardId]);

  const openFile = async (file: TutorSourceFile) => {
    setOpeningPath(file.storagePath);
    try {
      const url = await getDownloadURL(ref(getFirebaseStorage(), file.storagePath));
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setOpeningPath(null);
    }
  };

  if (loading || !notes) return null;

  return (
    <details className="mb-3 rounded-xl border border-dashed bg-muted/30">
      <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        Tutor notes
        <span className="ml-2 text-xs font-normal text-muted-foreground">
          Family cannot see this
        </span>
      </summary>
      <div className="space-y-3 border-t px-4 py-3">
        {notes.body ? (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{notes.body}</p>
        ) : null}
        {notes.files.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {notes.files.map((file) => (
              <Button
                key={file.storagePath}
                type="button"
                variant="outline"
                size="sm"
                disabled={openingPath === file.storagePath}
                onClick={() => void openFile(file)}
              >
                {openingPath === file.storagePath ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileText className="mr-2 h-4 w-4" />
                )}
                {file.fileName}
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}
