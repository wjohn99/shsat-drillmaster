const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DatedSession = {
  id: string;
  completedAt?: { toMillis?: () => number; toDate?: () => Date } | null;
  attemptNumber?: number;
};

function completedMs(session: DatedSession): number {
  const stamp = session.completedAt;
  if (!stamp) return 0;
  if (typeof stamp.toMillis === "function") {
    const ms = stamp.toMillis();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof stamp.toDate === "function") {
    const ms = stamp.toDate().getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  return 0;
}

function formatDate(date: Date): string {
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

function formatTime(date: Date): string {
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const suffix = date.getHours() >= 12 ? "PM" : "AM";
  const hours = date.getHours() % 12 || 12;
  return `${hours}:${minutes} ${suffix}`;
}

export function diagnosticSessionsByDate<T extends DatedSession>(sessions: T[]): T[] {
  return [...sessions].sort((a, b) => completedMs(a) - completedMs(b));
}

export function diagnosticResultButtonLabel(session: DatedSession, sessions: DatedSession[]): string {
  const ms = completedMs(session);
  if (!ms) {
    return session.attemptNumber ? `Results, attempt ${session.attemptNumber}` : "Results";
  }
  const date = new Date(ms);
  const sameDay = sessions.some((other) => {
    if (other.id === session.id) return false;
    const otherMs = completedMs(other);
    if (!otherMs) return false;
    const otherDate = new Date(otherMs);
    return otherDate.toDateString() === date.toDateString();
  });
  const formatted = formatDate(date);
  return sameDay ? `Results, ${formatted}, ${formatTime(date)}` : `Results, ${formatted}`;
}
