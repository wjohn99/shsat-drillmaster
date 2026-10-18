import type { ReactNode } from "react";

/** Mixed number, then a simple a/b. Digits only, so and/or and URLs stay plain. */
const MIXED_FRACTION_RE =
  /(^|[^A-Za-z0-9./])(-|−)?(\d+)\s+(\d+)\s*\/\s*(\d+)(?![A-Za-z0-9/])/g;
const SIMPLE_FRACTION_RE =
  /(^|[^A-Za-z0-9./])(-|−)?(\d+)\s*\/\s*(\d+)(?![A-Za-z0-9/])/g;
/** *feel* / *understood*. Skips 3*4 and unmatched stars. */
const EMPHASIS_RE = /\*([A-Za-z](?:[^*]*[A-Za-z])?)\*/g;

function StackedFraction({
  sign,
  whole,
  numerator,
  denominator,
}: {
  sign?: string;
  whole?: string;
  numerator: string;
  denominator: string;
}) {
  const spoken = whole
    ? `${sign ?? ""}${whole} ${numerator}/${denominator}`
    : `${sign ?? ""}${numerator}/${denominator}`;

  return (
    <span className="math-mixed" title={spoken}>
      {sign ? <span className="math-sign">{sign}</span> : null}
      {whole ? <span className="math-whole">{whole}</span> : null}
      <span className="math-frac" aria-label={spoken}>
        <span className="math-num">{numerator}</span>
        <span className="math-bar" aria-hidden />
        <span className="math-den">{denominator}</span>
      </span>
    </span>
  );
}

function replaceFractions(
  text: string,
  pattern: RegExp,
  toNode: (match: RegExpExecArray) => ReactNode,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  pattern.lastIndex = 0;
  let match = pattern.exec(text);
  let index = 0;
  while (match) {
    const start = match.index;
    if (start > last) nodes.push(text.slice(last, start));
    nodes.push(<span key={`${pattern.source}-${index}`}>{toNode(match)}</span>);
    last = start + match[0].length;
    index += 1;
    match = pattern.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderSimpleFractions(text: string, keyPrefix: string): ReactNode[] {
  return replaceFractions(text, SIMPLE_FRACTION_RE, (match) => (
    <>
      {match[1]}
      <StackedFraction sign={match[2]} numerator={match[3]} denominator={match[4]} />
    </>
  )).map((node, i) => <span key={`${keyPrefix}-s-${i}`}>{node}</span>);
}

function renderFractions(text: string, keyPrefix: string): ReactNode {
  if (!text.includes("/")) return text;

  const mixed = replaceFractions(text, MIXED_FRACTION_RE, (match) => (
    <>
      {match[1]}
      <StackedFraction
        sign={match[2]}
        whole={match[3]}
        numerator={match[4]}
        denominator={match[5]}
      />
    </>
  ));

  return mixed.map((part, i) =>
    typeof part === "string" ? (
      <span key={`${keyPrefix}-m-${i}`}>{renderSimpleFractions(part, `${keyPrefix}-m-${i}`)}</span>
    ) : (
      <span key={`${keyPrefix}-m-${i}`}>{part}</span>
    ),
  );
}

function Marker({ keep }: { keep: boolean }) {
  if (!keep) return null;
  return (
    <span aria-hidden className="hidden">
      *
    </span>
  );
}

function splitEmphasis(text: string, keepMarkers: boolean, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  EMPHASIS_RE.lastIndex = 0;
  let match = EMPHASIS_RE.exec(text);
  let index = 0;
  while (match) {
    if (match.index > last) nodes.push(text.slice(last, match.index));
    nodes.push(
      <em key={`${keyPrefix}-em-${index}`} className="italic">
        <Marker keep={keepMarkers} />
        {match[1]}
        <Marker keep={keepMarkers} />
      </em>,
    );
    last = match.index + match[0].length;
    index += 1;
    match = EMPHASIS_RE.exec(text);
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function renderMathText(text: string, keepEmphasisMarkers = false): ReactNode {
  if (!text) return text;
  const hasSlash = text.includes("/");
  const hasStar = text.includes("*");
  if (!hasSlash && !hasStar) return text;

  const parts = hasStar ? splitEmphasis(text, keepEmphasisMarkers, "e") : [text];
  return parts.map((part, i) => {
    if (typeof part !== "string") return <span key={`e-${i}`}>{part}</span>;
    if (!hasSlash) return <span key={`e-${i}`}>{part}</span>;
    return <span key={`e-${i}`}>{renderFractions(part, `e-${i}`)}</span>;
  });
}

export function MathText({
  text,
  keepEmphasisMarkers = false,
}: {
  text: string;
  keepEmphasisMarkers?: boolean;
}) {
  return <>{renderMathText(text, keepEmphasisMarkers)}</>;
}
