import { extractHttpUrls, parseLinkifiedText } from "@/lib/linkifyText";
import { cn } from "@/lib/utils";

const linkClassName =
  "text-primary underline underline-offset-2 break-all hover:text-primary/80";

export function LinkifiedText({
  text,
  className,
  stopClickPropagation = false,
}: {
  text: string;
  className?: string;
  stopClickPropagation?: boolean;
}) {
  const parts = parseLinkifiedText(text);
  if (parts.length === 0) return null;

  return (
    <span className={cn("whitespace-pre-wrap", className)}>
      {parts.map((part, index) =>
        part.type === "link" ? (
          <a
            key={`${part.href}-${index}`}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClassName}
            onClick={stopClickPropagation ? (event) => event.stopPropagation() : undefined}
          >
            {part.value}
          </a>
        ) : (
          <span key={index}>{part.value}</span>
        ),
      )}
    </span>
  );
}

export function NoteLinkList({ text }: { text: string }) {
  const urls = extractHttpUrls(text);
  if (urls.length === 0) return null;

  return (
    <div className="flex flex-col gap-1">
      {urls.map((href) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn("text-sm", linkClassName)}
        >
          {href}
        </a>
      ))}
    </div>
  );
}
