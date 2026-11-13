const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

type DatedSession = {
  id: string;
  completedAt?: { toMillis?: () => number; toDate?: () => Date } | null;
  attemptNumber?: number;
};

function millisFromStamp(stamp: unknown): number {
  if (stamp == null || stamp === "") return 0;
  if (typeof stamp === "number") return Number.isFinite(stamp) ? stamp : 0;
  if (stamp instanceof Date) {
    const ms = stamp.getTime();
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof stamp === "string") {
    const ms = Date.parse(stamp);
    return Number.isFinite(ms) ? ms : 0;
  }
  if (typeof stamp !== "object") return 0;

  const value = stamp as {
    toMillis?: () => number;
    toDate?: () => Date;
    seconds?: number;
    nanoseconds?: number;
    _seconds?: number;
    _nanoseconds?: number;
  };
  if (typeof value.toMillis === "function") {
    const ms = value.toMillis();
    if (Number.isFinite(ms)) return ms;
  }
  if (typeof value.toDate === "function") {
    const ms = value.toDate().getTime();
    if (Number.isFinite(ms)) return ms;
  }
  const seconds = typeof value.seconds === "number" ? value.seconds : value._seconds;
  const nanoseconds =
    typeof value.nanoseconds === "number" ? value.nanoseconds : value._nanoseconds ?? 0;
  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    return seconds * 1000 + nanoseconds / 1e6;
  }
  return 0;
}

export function completedMs(session: { completedAt?: unknown } | null | undefined): number {
  return millisFromStamp(session?.completedAt);
}

export function diagnosticSittingDate(session: { completedAt?: unknown } | null | undefined): string {
  const ms = completedMs(session);
  if (!ms) return "Date unavailable";
  return formatDate(new Date(ms));
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
