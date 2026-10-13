export type LinkifiedPart =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

const URL_PATTERN = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+/gi;

function stripTrailingPunctuation(url: string): string {
  let out = url;
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (".,;:!?…".includes(last)) {
      out = out.slice(0, -1);
      continue;
    }
    if (last === ")") {
      const opens = (out.match(/\(/g) ?? []).length;
      const closes = (out.match(/\)/g) ?? []).length;
      if (closes > opens) {
        out = out.slice(0, -1);
        continue;
      }
    }
    break;
  }
  return out;
}

export function hrefForDisplayedUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(href);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.href;
  } catch {
    return null;
  }
}

export function parseLinkifiedText(text: string): LinkifiedPart[] {
  const source = String(text ?? "");
  if (!source) return [];

  const parts: LinkifiedPart[] = [];
  const matcher = new RegExp(URL_PATTERN.source, "gi");
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(source)) !== null) {
    const raw = match[0];
    const cleaned = stripTrailingPunctuation(raw);
    const href = hrefForDisplayedUrl(cleaned);
    const start = match.index;
    if (start > lastIndex) {
      parts.push({ type: "text", value: source.slice(lastIndex, start) });
    }
    if (href) {
      parts.push({ type: "link", value: cleaned, href });
      lastIndex = start + cleaned.length;
      matcher.lastIndex = lastIndex;
    } else {
      parts.push({ type: "text", value: raw });
      lastIndex = start + raw.length;
    }
  }

  if (lastIndex < source.length) {
    parts.push({ type: "text", value: source.slice(lastIndex) });
  }

  return parts;
}

export function extractHttpUrls(text: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const part of parseLinkifiedText(text)) {
    if (part.type !== "link" || seen.has(part.href)) continue;
    seen.add(part.href);
    urls.push(part.href);
  }
  return urls;
}
