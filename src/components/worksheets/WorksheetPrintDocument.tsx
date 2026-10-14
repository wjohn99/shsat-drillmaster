import { CgtBlock } from "@/components/question/CgtBlock";
import { isIndyCheckboxMultiSubtype } from "@/lib/indyAta";
import { buildWorksheetPrintBlocks } from "@/lib/worksheetPrint";
import type { Passage, Question } from "@/types";

function PrintParagraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return null;

  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="mb-3 whitespace-pre-wrap last:mb-0">
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function ChoiceMark({ square }: { square?: boolean }) {
  return (
    <span
      aria-hidden
      className={
        square
          ? "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-[2px] border border-foreground"
          : "mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border border-foreground"
      }
    />
  );
}

function PrintChoices({ question }: { question: Question }) {
  if (!question.choices?.length) return null;
  const multi = isIndyCheckboxMultiSubtype(question.subtype);
  return (
    <div className="mt-3 space-y-2">
      {question.choices.map((choice) => (
        <div key={choice.id} className="flex items-start gap-2.5 break-inside-avoid">
          <ChoiceMark square={multi} />
          <p className="min-w-0 whitespace-pre-wrap leading-snug">
            <span className="font-medium">{choice.label}.</span> {choice.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function PrintQuestionBody({ question }: { question: Question }) {
  if (question.cgt) {
    return (
      <>
        <div className="my-3">
          <CgtBlock spec={question.cgt} />
        </div>
        {question.choices?.length ? <PrintChoices question={question} /> : null}
      </>
    );
  }

  if (question.subtype === "INDY-IC" && question.ic) {
    const sentence = question.ic.segments
      .map((segment) => (segment.type === "text" ? segment.value : "________"))
      .join("");
    return (
      <>
        {question.ic.instruction ? (
          <p className="mb-2 italic text-[0.95em]">{question.ic.instruction}</p>
        ) : null}
        <p className="whitespace-pre-wrap">{sentence}</p>
        {question.ic.slots.map((slot, index) => (
          <p key={slot.slotId} className="mt-2 text-[0.95em]">
            Blank {index + 1} options: {slot.options.map((option) => option.text).join("; ")}
          </p>
        ))}
      </>
    );
  }

  if (question.subtype === "INDY-DND" && question.dnd) {
    return (
      <>
        {question.dnd.instruction ? (
          <p className="mb-2 italic text-[0.95em]">{question.dnd.instruction}</p>
        ) : null}
        <p className="mb-2">
          Word bank: {question.dnd.pool.map((item) => item.text).join(" · ")}
        </p>
        <ol className="list-decimal space-y-1 pl-5">
          {question.dnd.zones.map((zone) => {
            const label =
              zone.prompt ||
              `${zone.beforeText ?? ""} ________ ${zone.afterText ?? ""}`.replace(/\s+/g, " ").trim();
            return <li key={zone.id}>{label}</li>;
          })}
        </ol>
      </>
    );
  }

  if (question.subtype === "INDY-EE" && question.ee) {
    const prefix = question.ee.inputPrefix ? `${question.ee.inputPrefix} ` : "";
    return (
      <>
        {question.ee.instruction ? (
          <p className="mb-2 italic text-[0.95em]">{question.ee.instruction}</p>
        ) : null}
        <p className="mt-3 tracking-[0.2em]">{prefix}________________________</p>
      </>
    );
  }

  if (question.subtype === "INDY-WP" && question.wp?.instruction) {
    return (
      <>
        <p className="mb-2 italic text-[0.95em]">{question.wp.instruction}</p>
        <PrintChoices question={question} />
      </>
    );
  }

  if (question.subtype === "INDY-HS") {
    return (
      <>
        {question.hs?.instruction ? (
          <p className="mb-2 italic text-[0.95em]">{question.hs.instruction}</p>
        ) : null}
        {question.hs?.imageSrc ? (
          <img
            src={question.hs.imageSrc}
            alt={question.hs.imageAlt || "Diagram"}
            className="my-3 max-h-[4.5in] max-w-full object-contain"
          />
        ) : (
          <p className="italic text-[0.95em]">
            Diagram not printed. Use the online item or sketch from class.
          </p>
        )}
      </>
    );
  }

  if (question.subtype === "INDY-GIF" && question.gif) {
    return (
      <>
        {question.gif.instruction ? (
          <p className="mb-2 italic text-[0.95em]">{question.gif.instruction}</p>
        ) : null}
        <p className="italic text-[0.95em]">
          Plot on scratch axes. x from {question.gif.xMin} to {question.gif.xMax}, y from{" "}
          {question.gif.yMin} to {question.gif.yMax}.
        </p>
      </>
    );
  }

  if (question.subtype === "GRID_IN") {
    return <p className="mt-3">Write your answer: ________________</p>;
  }

  if (isIndyCheckboxMultiSubtype(question.subtype)) {
    return (
      <>
        <p className="mb-2 italic text-[0.95em]">
          {question.subtype === "INDY-MS" && question.ms
            ? `Select exactly ${question.ms.selectCount} answer${question.ms.selectCount === 1 ? "" : "s"}.`
            : "Select all that apply."}
        </p>
        <PrintChoices question={question} />
      </>
    );
  }

  if (question.choices?.length) {
    return <PrintChoices question={question} />;
  }

  return <p className="mt-3">________________________</p>;
}

function PrintQuestion({ question, number }: { question: Question; number: number }) {
  return (
    <article className="break-inside-avoid mb-7">
      <h3 className="mb-2 text-[12pt] font-semibold">Question {number}</h3>
      <PrintParagraphs text={question.stem} />
      <PrintQuestionBody question={question} />
    </article>
  );
}

export function WorksheetPrintDocument({
  title,
  subtitle,
  questions,
  passages,
}: {
  title: string;
  subtitle?: string;
  questions: Question[];
  passages: Passage[];
}) {
  const blocks = buildWorksheetPrintBlocks(questions, passages);
  const printedAt = new Date().toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="worksheet-print mx-auto max-w-[7.5in] bg-white px-8 py-10 text-[11pt] leading-[1.45] text-neutral-900 print:max-w-none print:px-0 print:py-0">
      <header className="mb-8 border-b border-neutral-300 pb-4">
        <p className="text-[10pt] font-medium uppercase tracking-[0.14em] text-neutral-500">
          StepPrep
        </p>
        <h1 className="mt-1 font-serif text-[22pt] font-semibold leading-tight">{title}</h1>
        <p className="mt-2 text-[10.5pt] text-neutral-600">
          {printedAt}
          {` · ${questions.length} question${questions.length === 1 ? "" : "s"}`}
          {" · Student copy, no answer key"}
        </p>
        {subtitle ? (
          <p className="mt-1 text-[10.5pt] text-neutral-600">{subtitle}</p>
        ) : null}
      </header>

      {blocks.map((block) => {
        if (block.kind === "question") {
          return (
            <PrintQuestion
              key={block.question.id}
              question={block.question}
              number={block.number}
            />
          );
        }

        const first = block.questions[0]?.number;
        const last = block.questions[block.questions.length - 1]?.number;
        const range =
          first && last && first !== last
            ? `Questions ${first}-${last} refer to this passage.`
            : first
              ? `Question ${first} refers to this passage.`
              : null;

        return (
          <section key={block.passage.id} className="mb-8">
            <h2 className="mb-3 font-serif text-[14pt] font-semibold">
              Reading passage: {block.passage.title}
            </h2>
            {range ? <p className="mb-3 italic text-[10.5pt] text-neutral-600">{range}</p> : null}
            <PrintParagraphs text={block.passage.body} className="mb-6" />
            {block.questions.map((item) => (
              <PrintQuestion
                key={item.question.id}
                question={item.question}
                number={item.number}
              />
            ))}
          </section>
        );
      })}
    </div>
  );
}
