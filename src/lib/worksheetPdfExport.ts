import { jsPDF } from "jspdf";
import type { CgtVisual, Question, Passage } from "@/types";

const PAGE_FOOTER_MM = 18;

function stripHtml(html: string): string {
  if (!html) return "";
  const d = document.createElement("div");
  d.innerHTML = html;
  return (d.textContent || d.innerText || "").replace(/\s+/g, " ").trim();
}

function cgtVisualLines(visual: CgtVisual): string[] {
  if (visual.type === "table") {
    const lines: string[] = [];
    if (visual.caption) lines.push(visual.caption);
    lines.push(visual.headers.join(" | "));
    for (const row of visual.rows) {
      lines.push(row.join(" | "));
    }
    return lines;
  }
  const lines: string[] = [];
  if (visual.title) lines.push(visual.title);
  for (let i = 0; i < visual.categories.length; i++) {
    lines.push(`${visual.categories[i]}: ${visual.values[i]}${visual.valueSuffix ?? ""}`);
  }
  return lines;
}

type PdfContext = {
  doc: jsPDF;
  pageW: number;
  pageH: number;
  margin: number;
  maxW: number;
  y: number;
};

function makeContext(): PdfContext {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 16;
  return { doc, pageW, pageH, margin, maxW: pageW - 2 * margin, y: margin };
}

function lineHeight(fontSize: number): number {
  return fontSize * 0.42;
}

function ensureSpace(ctx: PdfContext, need: number) {
  if (ctx.y + need > ctx.pageH - PAGE_FOOTER_MM) {
    ctx.doc.addPage();
    ctx.y = ctx.margin;
  }
}

function addParagraph(
  ctx: PdfContext,
  text: string,
  fontSize = 10,
  style: "normal" | "bold" | "italic" = "normal"
) {
  const plain = stripHtml(text);
  if (!plain) return;
  ctx.doc.setFont("helvetica", style === "bold" ? "bold" : style === "italic" ? "italic" : "normal");
  ctx.doc.setFontSize(fontSize);
  const lh = lineHeight(fontSize);
  const lines = ctx.doc.splitTextToSize(plain, ctx.maxW) as string[];
  for (const line of lines) {
    ensureSpace(ctx, lh + 0.5);
    ctx.doc.text(line, ctx.margin, ctx.y);
    ctx.y += lh;
  }
  ctx.y += 1.5;
}

function appendChoicesMc(ctx: PdfContext, q: Question) {
  if (!q.choices?.length) return;
  for (const c of q.choices) {
    addParagraph(ctx, `${c.label}. ${stripHtml(c.text)}`, 10);
  }
}

function appendChoicesCheckbox(ctx: PdfContext, q: Question) {
  if (!q.choices?.length) return;
  for (const c of q.choices) {
    addParagraph(ctx, `☐ ${c.label}. ${stripHtml(c.text)}`, 10);
  }
}

function appendQuestionContent(ctx: PdfContext, q: Question) {
  if (q.subtype === "INDY-IC" && q.ic) {
    if (q.ic.instruction) addParagraph(ctx, q.ic.instruction, 9, "italic");
    let flat = "";
    for (const seg of q.ic.segments) {
      if (seg.type === "text") flat += seg.value;
      else flat += "_____";
    }
    addParagraph(ctx, flat, 10);
    for (const slot of q.ic.slots) {
      const opts = slot.options.map((o) => stripHtml(o.text)).join("; ");
      addParagraph(ctx, `Blank options: ${opts}`, 9);
    }
    return;
  }

  if (q.subtype === "INDY-DND" && q.dnd) {
    if (q.dnd.instruction) addParagraph(ctx, q.dnd.instruction, 9, "italic");
    addParagraph(
      ctx,
      "Word bank: " + q.dnd.pool.map((p) => stripHtml(p.text)).join(" · "),
      10
    );
    for (const z of q.dnd.zones) {
      const label = z.prompt || `${z.beforeText ?? ""} _____ ${z.afterText ?? ""}`;
      addParagraph(ctx, `• ${stripHtml(label)}`, 10);
    }
    return;
  }

  if (q.subtype === "INDY-EE" && q.ee) {
    if (q.ee.instruction) addParagraph(ctx, q.ee.instruction, 9, "italic");
    const prefix = q.ee.inputPrefix ? stripHtml(q.ee.inputPrefix) + " " : "";
    addParagraph(ctx, `${prefix}_______________________________`, 10);
    return;
  }

  if (q.subtype === "INDY-CGT" && q.cgt) {
    for (const line of cgtVisualLines(q.cgt.visual)) {
      addParagraph(ctx, line, 9);
    }
    if (q.cgt.sourceNote) addParagraph(ctx, q.cgt.sourceNote, 8, "italic");
  }

  if (q.subtype === "INDY-WP" && q.wp?.instruction) {
    addParagraph(ctx, q.wp.instruction, 9, "italic");
  }

  if (q.subtype === "INDY-HS") {
    addParagraph(
      ctx,
      "[Diagram not included in PDF — use the online item or sketch from class.]",
      9,
      "italic"
    );
    return;
  }

  if (q.subtype === "INDY-GIF" && q.gif) {
    if (q.gif.instruction) addParagraph(ctx, q.gif.instruction, 9, "italic");
    addParagraph(
      ctx,
      `Grid: x from ${q.gif.xMin} to ${q.gif.xMax}, y from ${q.gif.yMin} to ${q.gif.yMax}. Plot on scratch axes.`,
      9,
      "italic"
    );
    return;
  }

  if (q.subtype === "GRID_IN") {
    addParagraph(
      ctx,
      "Grid-in: write your answer in the format used on the SHSAT answer sheet.",
      10
    );
    return;
  }

  if (q.subtype === "INDY-ATA" || q.subtype === "TEI_MULTIPLE_SELECT") {
    if (q.choices?.length) {
      addParagraph(ctx, "Select all that apply:", 9, "italic");
      appendChoicesCheckbox(ctx, q);
    }
    return;
  }

  if (q.subtype === "INDY-MS" && q.ms) {
    if (q.ms.instruction) addParagraph(ctx, q.ms.instruction, 9, "italic");
    addParagraph(ctx, `Select exactly ${q.ms.selectCount} answer(s).`, 9, "italic");
    appendChoicesCheckbox(ctx, q);
    return;
  }

  appendChoicesMc(ctx, q);

  if (!q.choices?.length && q.subtype !== "INDY-CGT") {
    addParagraph(ctx, "_______________________________", 10);
  }
}

/**
 * Builds a student-facing PDF (no answer key) and opens it in a new tab for print / save.
 */
export function openWorksheetPdfInNewTab(
  questions: Question[],
  passageList: Passage[],
  options: { tagSummaryLine: string }
): void {
  if (questions.length === 0) return;

  const ctx = makeContext();
  const { doc } = ctx;

  addParagraph(ctx, "SHSAT practice worksheet", 16, "bold");
  addParagraph(ctx, options.tagSummaryLine, 9);
  addParagraph(ctx, "Student copy — no answer key. For classroom or take-home use.", 9, "italic");
  ctx.y += 2;

  const printedPassages = new Set<string>();
  const passageById = new Map(passageList.map((p) => [p.id, p]));

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    if (q.passageId && !printedPassages.has(q.passageId)) {
      const p = passageById.get(q.passageId);
      if (p) {
        addParagraph(ctx, `Reading passage: ${p.title}`, 11, "bold");
        if (p.sourceMeta) addParagraph(ctx, p.sourceMeta, 8, "italic");
        const body = stripHtml(p.body);
        ctx.doc.setFont("helvetica", "normal");
        ctx.doc.setFontSize(10);
        const lh = lineHeight(10);
        const lines = ctx.doc.splitTextToSize(body, ctx.maxW) as string[];
        for (const line of lines) {
          ensureSpace(ctx, lh + 0.5);
          ctx.doc.text(line, ctx.margin, ctx.y);
          ctx.y += lh;
        }
        ctx.y += 2;
        printedPassages.add(q.passageId);
      }
    }

    addParagraph(ctx, `Question ${i + 1}`, 12, "bold");
    addParagraph(ctx, stripHtml(q.stem), 10);
    appendQuestionContent(ctx, q);
    ctx.y += 3;
  }

  const pageCount = doc.getNumberOfPages();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = ctx.margin;
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Page ${p} of ${pageCount}`, margin, pageH - 10);
  }

  const arr = doc.output("arraybuffer");
  const blob = new Blob([arr], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const filename = `shsat-worksheet-${new Date().toISOString().slice(0, 10)}.pdf`;

  // Navigating directly to blob: URLs often shows a blank tab or the URL string instead of the PDF viewer.
  // A new document with <embed> reliably opens the browser’s PDF UI (preview / print / save).
  const viewer = window.open("", "_blank");
  if (viewer) {
    viewer.document.open();
    viewer.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Worksheet PDF</title>
  <style>html,body{margin:0;height:100%;overflow:hidden;background:#525659}</style>
</head>
<body>
  <embed src="${url}" type="application/pdf" width="100%" height="100%" style="position:fixed;inset:0;" />
</body>
</html>`);
    viewer.document.close();
    window.setTimeout(() => URL.revokeObjectURL(url), 600_000);
  } else {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }
}
