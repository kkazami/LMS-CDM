import { formatCents } from "./format";
import type { ReportBlock, ReportCheck, ReportDocument, ReportLine, ReportTableBlock } from "./types";

/**
 * Minimal, dependency-free PDF 1.4 writer that renders a ReportDocument using
 * the standard Helvetica fonts. The content is real (selectable, searchable)
 * text — never an image or placeholder.
 */

// Helvetica advance widths for ASCII 32–126 (1000 units/em).
const HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556,
  278, 278, 584, 584, 584, 556, 1015,
  667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611,
  278, 278, 278, 469, 556, 333,
  556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500,
  334, 260, 334, 584,
];
// Helvetica-Bold differs for letters only (digits/punctuation match closely enough).
const BOLD_UPPER = [722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611];
const BOLD_LOWER = [556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500];

function charWidth(code: number, bold: boolean): number {
  if (code >= 65 && code <= 90 && bold) return BOLD_UPPER[code - 65];
  if (code >= 97 && code <= 122 && bold) return BOLD_LOWER[code - 97];
  if (code >= 32 && code <= 126) return HELV[code - 32];
  return 556;
}

export function toLatin1(text: string): string {
  return text
    .replace(/[\u2212\u2013\u2014]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u203A/g, ">")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    // eslint-disable-next-line no-control-regex
    .replace(/[^\x20-\x7E\xA1-\xFF]/g, "?");
}

function textWidth(text: string, size: number, bold = false): number {
  let units = 0;
  for (let i = 0; i < text.length; i += 1) units += charWidth(text.charCodeAt(i), bold);
  return (units * size) / 1000;
}

function wrap(text: string, maxWidth: number, size: number, bold = false): string[] {
  const clean = toLatin1(text).trim();
  if (clean === "") return [""];
  const out: string[] = [];
  let current = "";
  const push = (word: string) => {
    // Hard-break single words wider than the column.
    let rest = word;
    while (textWidth(rest, size, bold) > maxWidth && rest.length > 1) {
      let cut = rest.length - 1;
      while (cut > 1 && textWidth(rest.slice(0, cut), size, bold) > maxWidth) cut -= 1;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    current = rest;
  };
  for (const word of clean.split(" ")) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) current = candidate;
    else {
      if (current) out.push(current);
      push(word);
    }
  }
  if (current) out.push(current);
  return out;
}

function pdfString(text: string): string {
  let out = "(";
  const latin = toLatin1(text);
  for (let i = 0; i < latin.length; i += 1) {
    const code = latin.charCodeAt(i);
    if (latin[i] === "(" || latin[i] === ")" || latin[i] === "\\") out += `\\${latin[i]}`;
    else if (code > 126) out += `\\${code.toString(8).padStart(3, "0")}`;
    else out += latin[i];
  }
  return `${out})`;
}

type Rgb = [number, number, number];
const BLACK: Rgb = [0.1, 0.12, 0.16];
const MUTED: Rgb = [0.4, 0.44, 0.5];
const GREEN: Rgb = [0.07, 0.5, 0.25];
const RED: Rgb = [0.75, 0.12, 0.12];
const BLUE: Rgb = [0.15, 0.3, 0.6];

const num = (n: number) => (Math.round(n * 100) / 100).toString();
const rgb = (c: Rgb) => `${num(c[0])} ${num(c[1])} ${num(c[2])}`;

class Pdf {
  readonly W: number;
  readonly H: number;
  readonly margin = 40;
  private pages: string[][] = [];
  private page: string[] = [];
  y = 0;

  constructor(landscape: boolean) {
    this.W = landscape ? 842 : 595;
    this.H = landscape ? 595 : 842;
  }

  get left() {
    return this.margin;
  }
  get right() {
    return this.W - this.margin;
  }
  get contentWidth() {
    return this.right - this.left;
  }
  get bottomLimit() {
    return this.H - 52;
  }

  newPage() {
    this.page = [];
    this.pages.push(this.page);
    this.y = this.margin;
  }

  ensure(height: number, onNewPage?: () => void) {
    if (this.pages.length === 0) this.newPage();
    if (this.y + height > this.bottomLimit) {
      this.newPage();
      onNewPage?.();
    }
  }

  text(x: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.page.push(
      `BT /${bold ? "F2" : "F1"} ${num(size)} Tf ${rgb(color)} rg ${num(x)} ${num(this.H - baseline)} Td ${pdfString(str)} Tj ET`,
    );
  }

  textRight(xRight: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.text(xRight - textWidth(toLatin1(str), size, bold), baseline, str, size, bold, color);
  }

  textCenter(xCenter: number, baseline: number, str: string, size: number, bold = false, color: Rgb = BLACK) {
    this.text(xCenter - textWidth(toLatin1(str), size, bold) / 2, baseline, str, size, bold, color);
  }

  line(x1: number, y1: number, x2: number, y2: number, width = 0.5, color: Rgb = BLACK) {
    this.page.push(
      `q ${num(width)} w ${rgb(color)} RG ${num(x1)} ${num(this.H - y1)} m ${num(x2)} ${num(this.H - y2)} l S Q`,
    );
  }

  rect(x: number, yTop: number, w: number, h: number, color: Rgb) {
    this.page.push(`q ${rgb(color)} rg ${num(x)} ${num(this.H - yTop - h)} ${num(w)} ${num(h)} re f Q`);
  }

  /** Adds footers and serializes. */
  finish(title: string, footerLeft: string): Buffer {
    const total = this.pages.length;
    this.pages.forEach((content, index) => {
      content.push(
        `q 0.8 0.82 0.86 RG 0.5 w ${num(this.left)} ${num(this.H - (this.H - 40))} m ${num(this.right)} ${num(this.H - (this.H - 40))} l S Q`,
      );
      content.push(
        `BT /F1 8 Tf ${rgb(MUTED)} rg ${num(this.left)} ${num(28)} Td ${pdfString(footerLeft)} Tj ET`,
      );
      const label = `Page ${index + 1} of ${total}`;
      content.push(
        `BT /F1 8 Tf ${rgb(MUTED)} rg ${num(this.right - textWidth(label, 8))} ${num(28)} Td ${pdfString(label)} Tj ET`,
      );
    });

    const chunks: Buffer[] = [];
    const offsets: number[] = [];
    let length = 0;
    const write = (s: string) => {
      const b = Buffer.from(s, "latin1");
      chunks.push(b);
      length += b.length;
    };
    const object = (id: number, body: string) => {
      offsets[id] = length;
      write(`${id} 0 obj\n${body}\nendobj\n`);
    };

    // Object ids: 1 catalog, 2 pages, 3 F1, 4 F2, 5 info, then (page, content) pairs.
    write("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const kids = this.pages.map((_, i) => `${6 + i * 2} 0 R`).join(" ");
    object(1, "<< /Type /Catalog /Pages 2 0 R >>");
    object(2, `<< /Type /Pages /Kids [${kids}] /Count ${total} >>`);
    object(3, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
    object(4, "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
    const d = new Date();
    const stamp = `D:${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}${String(d.getUTCHours()).padStart(2, "0")}${String(d.getUTCMinutes()).padStart(2, "0")}${String(d.getUTCSeconds()).padStart(2, "0")}Z`;
    object(5, `<< /Title ${pdfString(title)} /Producer (CdM LMS Financial Statement Generator) /CreationDate (${stamp}) >>`);
    this.pages.forEach((content, i) => {
      const pageId = 6 + i * 2;
      const contentId = pageId + 1;
      const stream = content.join("\n");
      object(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.W} ${this.H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`,
      );
      object(contentId, `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
    });

    const objectCount = 5 + this.pages.length * 2;
    const xrefAt = length;
    let xref = `xref\n0 ${objectCount + 1}\n0000000000 65535 f \n`;
    for (let id = 1; id <= objectCount; id += 1) xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
    write(xref);
    write(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
    return Buffer.concat(chunks);
  }
}

// ─── Report layout ──────────────────────────────────────────────────────────

const AMOUNT_W = 110;

function drawLinesBlock(pdf: Pdf, block: Extract<ReportBlock, { type: "lines" }>) {
  if (block.title) {
    pdf.ensure(28);
    pdf.y += 8;
    pdf.text(pdf.left, pdf.y + 10, block.title, 11, true, BLUE);
    pdf.y += 16;
    pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.6, BLUE);
    pdf.y += 4;
  }
  for (const line of block.lines) drawLine(pdf, line);
}

function drawLine(pdf: Pdf, line: ReportLine) {
  const bold = line.kind === "heading" || line.kind === "total" || line.kind === "grand";
  const size = line.kind === "grand" ? 11 : 10;
  const indent = 14 * (line.indent ?? 0) + (line.kind === "heading" ? 0 : 0);
  const hasAmount = line.cents !== undefined;
  const labelWidth = pdf.contentWidth - indent - (hasAmount ? AMOUNT_W + 8 : 0);
  const labelLines = wrap(line.label, labelWidth, size, bold);
  const rowHeight = labelLines.length * (size + 3) + 3;

  pdf.ensure(rowHeight + (line.kind === "heading" ? 10 : 0));
  if (line.kind === "heading") pdf.y += 8;
  const top = pdf.y;
  labelLines.forEach((text, i) => {
    pdf.text(pdf.left + indent, top + size + i * (size + 3), text, size, bold, line.kind === "heading" ? BLUE : BLACK);
  });
  if (hasAmount) {
    const base = top + size;
    const amountLeft = pdf.right - AMOUNT_W;
    if (line.kind === "subtotal" || line.kind === "total" || line.kind === "grand") {
      pdf.line(amountLeft, top - 1, pdf.right, top - 1, 0.6);
    }
    pdf.textRight(pdf.right, base, formatCents(line.cents as number), size, bold);
    if (line.kind === "grand") {
      pdf.line(amountLeft, top + size + 3, pdf.right, top + size + 3, 0.6);
      pdf.line(amountLeft, top + size + 5, pdf.right, top + size + 5, 0.6);
    }
  }
  pdf.y += rowHeight + (line.kind === "grand" ? 4 : 0);
}

function columnWidths(block: ReportTableBlock, available: number): number[] {
  const size = 8.5;
  const natural = block.columns.map((col, i) => {
    let w = textWidth(toLatin1(col.label), size, true);
    for (const row of [...block.rows, ...(block.footer ?? [])]) {
      w = Math.max(w, textWidth(toLatin1(row[i] ?? ""), size, false));
    }
    return Math.min(Math.max(w + 10, 36), 170);
  });
  const total = natural.reduce((a, b) => a + b, 0);
  const scale = available / total;
  return natural.map((w) => Math.max(34, w * scale));
}

function drawTable(pdf: Pdf, block: ReportTableBlock) {
  const size = 8.5;
  const lineH = size + 2.5;
  const widths = columnWidths(block, pdf.contentWidth);
  const totalW = widths.reduce((a, b) => a + b, 0);
  const scaled = widths.map((w) => (w * pdf.contentWidth) / totalW);

  if (block.title) {
    pdf.ensure(40);
    pdf.y += 8;
    pdf.text(pdf.left, pdf.y + 10, block.title, 11, true, BLUE);
    pdf.y += 16;
  }

  const cellX = (i: number) => pdf.left + scaled.slice(0, i).reduce((a, b) => a + b, 0);

  const drawHeader = () => {
    const wrapped = block.columns.map((c, i) => wrap(c.label, scaled[i] - 8, size, true));
    const h = Math.max(...wrapped.map((l) => l.length)) * lineH + 6;
    pdf.rect(pdf.left, pdf.y, pdf.contentWidth, h, [0.9, 0.92, 0.96]);
    block.columns.forEach((c, i) => {
      wrapped[i].forEach((t, li) => {
        const base = pdf.y + size + 3 + li * lineH;
        if (c.align === "right") pdf.textRight(cellX(i) + scaled[i] - 4, base, t, size, true);
        else pdf.text(cellX(i) + 4, base, t, size, true);
      });
    });
    pdf.y += h;
  };

  pdf.ensure(40);
  drawHeader();

  const drawRow = (cells: string[], opts: { bold?: boolean; zebra?: boolean; topRule?: boolean }) => {
    const wrapped = block.columns.map((_, i) => wrap(cells[i] ?? "", scaled[i] - 8, size, opts.bold));
    const h = Math.max(...wrapped.map((l) => l.length)) * lineH + 6;
    pdf.ensure(h, drawHeader);
    if (opts.zebra) pdf.rect(pdf.left, pdf.y, pdf.contentWidth, h, [0.97, 0.975, 0.985]);
    if (opts.topRule) pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.8);
    block.columns.forEach((c, i) => {
      wrapped[i].forEach((t, li) => {
        const base = pdf.y + size + 3 + li * lineH;
        if (c.align === "right") pdf.textRight(cellX(i) + scaled[i] - 4, base, t, size, opts.bold);
        else pdf.text(cellX(i) + 4, base, t, size, opts.bold);
      });
    });
    pdf.y += h;
  };

  if (block.rows.length === 0) {
    pdf.ensure(20);
    pdf.text(pdf.left + 4, pdf.y + 14, "No entries.", size, false, MUTED);
    pdf.y += 20;
  }
  block.rows.forEach((row, index) => drawRow(row, { zebra: index % 2 === 1 }));
  (block.footer ?? []).forEach((row) => drawRow(row, { bold: true, topRule: true }));
  pdf.y += 6;
}

function drawChecks(pdf: Pdf, checks: ReportCheck[]) {
  if (checks.length === 0) return;
  pdf.ensure(34);
  pdf.y += 12;
  pdf.text(pdf.left, pdf.y + 11, "Validation Results", 11, true, BLUE);
  pdf.y += 16;
  pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.6, BLUE);
  pdf.y += 6;
  const badge = (c: ReportCheck) => (c.status === "pass" ? "PASS" : c.status === "fail" ? "REVIEW" : "NOTE");
  const color = (c: ReportCheck): Rgb => (c.status === "pass" ? GREEN : c.status === "fail" ? RED : MUTED);
  for (const check of checks) {
    const detail = wrap(check.detail, pdf.contentWidth - 60, 9);
    const height = 12 + detail.length * 11 + 4;
    pdf.ensure(height);
    pdf.text(pdf.left, pdf.y + 10, badge(check), 8.5, true, color(check));
    pdf.text(pdf.left + 56, pdf.y + 10, toLatin1(check.label), 9.5, true);
    detail.forEach((t, i) => pdf.text(pdf.left + 56, pdf.y + 22 + i * 11, t, 9, false, MUTED));
    pdf.y += height + 6;
  }
}

function drawNotes(pdf: Pdf, notes: string) {
  const text = notes.trim();
  if (!text) return;
  pdf.ensure(34);
  pdf.y += 12;
  pdf.text(pdf.left, pdf.y + 11, "Notes", 11, true, BLUE);
  pdf.y += 16;
  pdf.line(pdf.left, pdf.y, pdf.right, pdf.y, 0.6, BLUE);
  pdf.y += 6;
  for (const paragraph of text.split(/\r?\n/)) {
    const lines = wrap(paragraph, pdf.contentWidth, 9.5);
    for (const t of lines) {
      pdf.ensure(13);
      pdf.text(pdf.left, pdf.y + 10, t, 9.5);
      pdf.y += 13;
    }
    pdf.y += 3;
  }
}

export interface PdfOptions {
  generatedAt: Date;
  preparedBy?: string;
}

/** Renders the generated report into a PDF file buffer. */
export function renderStatementPdf(report: ReportDocument, options: PdfOptions): Buffer {
  const wide = report.blocks.some((b) => b.type === "table" && b.columns.length >= 6);
  const pdf = new Pdf(wide);
  pdf.newPage();

  // Header
  const centerX = pdf.W / 2;
  pdf.text(pdf.left, pdf.y + 7, "FINANCIAL STATEMENT", 7.5, true, MUTED);
  pdf.y += 14;
  pdf.textCenter(centerX, pdf.y + 16, report.businessName || "(Business name not set)", 17, true);
  pdf.y += 24;
  pdf.textCenter(centerX, pdf.y + 12, report.title, 13, true, BLUE);
  pdf.y += 18;
  pdf.textCenter(centerX, pdf.y + 10, report.periodText, 10, false, MUTED);
  pdf.y += 14;
  for (const option of report.options) {
    pdf.textCenter(centerX, pdf.y + 9, `${option.label}: ${option.value}`, 9, false, MUTED);
    pdf.y += 12;
  }
  pdf.textCenter(centerX, pdf.y + 9, "Amounts in Philippine Peso (PHP)", 8.5, false, MUTED);
  pdf.y += 10;
  pdf.line(pdf.left, pdf.y + 4, pdf.right, pdf.y + 4, 1.2);
  pdf.y += 8;

  for (const block of report.blocks) {
    if (block.type === "lines") drawLinesBlock(pdf, block);
    else drawTable(pdf, block);
  }
  drawChecks(pdf, report.checks);
  drawNotes(pdf, report.notes);

  const stamp = options.generatedAt.toISOString().slice(0, 16).replace("T", " ");
  const footer = `${options.preparedBy ? `Prepared by ${options.preparedBy.slice(0, 40)} | ` : ""}Generated ${stamp} UTC | CdM LMS Financial Statement Generator`;
  return pdf.finish(`${report.title} - ${report.businessName}`, footer);
}
