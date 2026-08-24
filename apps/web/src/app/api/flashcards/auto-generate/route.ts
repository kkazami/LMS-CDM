import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import nlp from "compromise";
import AdmZip from "adm-zip";

// ─── Types ───────────────────────────────────────────────────────────────────
interface RawCard {
  front: string;
  back: string;
}

// ─── PPTX Slide-Level XML Parser ─────────────────────────────────────────────
// Parses the internal XML of a .pptx file to extract slide titles and body text.
// Title → Card Front, Body → Card Back.

function parsePptxSlides(buffer: Buffer): RawCard[] {
  const cards: RawCard[] = [];
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  // Filter only slide XML files (skip slideLayouts, slideMasters, etc.)
  const slideEntries = entries
    .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
    .sort((a, b) => {
      const numA = parseInt(a.entryName.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      const numB = parseInt(b.entryName.match(/slide(\d+)/i)?.[1] ?? "0", 10);
      return numA - numB;
    });

  for (const entry of slideEntries) {
    const xml = entry.getData().toString("utf8");

    // Extract title text: look for <p:ph type="title" /> or <p:ph type="ctrTitle" />
    // then grab all <a:t> text within that shape
    let titleText = "";
    let bodyText = "";

    // Split XML into shape blocks <p:sp>...</p:sp>
    const shapeBlocks = xml.match(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/gi) || [];

    for (const shape of shapeBlocks) {
      const isTitle =
        /<p:ph[^>]*type\s*=\s*"(title|ctrTitle)"/i.test(shape);
      const isSubTitle =
        /<p:ph[^>]*type\s*=\s*"subTitle"/i.test(shape);

      // Extract all <a:t>...</a:t> text nodes from this shape
      const textNodes = shape.match(/<a:t>([^<]*)<\/a:t>/gi) || [];
      const shapeText = textNodes
        .map((t) => t.replace(/<\/?a:t>/gi, ""))
        .join(" ")
        .trim();

      if (!shapeText) continue;

      if (isTitle) {
        titleText += (titleText ? " " : "") + shapeText;
      } else if (isSubTitle) {
        bodyText += (bodyText ? "\n" : "") + shapeText;
      } else {
        bodyText += (bodyText ? "\n" : "") + shapeText;
      }
    }

    if (!titleText && bodyText) {
      const parts = bodyText.split("\n");
      titleText = parts[0].trim();
      bodyText = parts.slice(1).join("\n").trim();
    }

    titleText = titleText.replace(/:$/, "").trim();
    bodyText = bodyText.trim();
    
    // For flashcards, a wall of text is unreadable. We take the first primary point (bullet/sentence)
    const firstBodyPoint = bodyText.split("\n")[0].trim();

    // Ignore generic non-educational instructional slides
    const lowerTitle = titleText.toLowerCase();
    const ignoreTitles = ["activity", "task", "question", "objective", "objectives", "summary", "conclusion", "introduction", "assignment", "homework", "agenda"];
    if (ignoreTitles.includes(lowerTitle) || lowerTitle.startsWith("activity ") || lowerTitle.startsWith("task ")) {
      continue;
    }

    if (titleText && firstBodyPoint) {
      cards.push({ front: `What is ${titleText}?`, back: firstBodyPoint });
    }
  }

  return cards;
}

// ─── PDF Text → Flashcard Extraction (Rule-Based NLP) ────────────────────────
function extractFlashcardsFromText(text: string): RawCard[] {
  const cards: RawCard[] = [];

  // 1. Pre-process explicitly formatted structures (Bullet points, Colons)
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let currentHeader = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect standalone Headers (short lines, no punctuation at end)
    if (line.length > 3 && line.length < 60 && !/[.?!:]$/.test(line)) {
      if (!/\b(activity|task|question|objective|summary|conclusion|introduction|assignment|homework|agenda|lecture|module|unit|lesson|chapter|instructions)\b/i.test(line.replace(/[^a-zA-Z0-9\s]/g, "").trim())) {
        currentHeader = line;
      }
      continue;
    }

    // Detect Bullet Points attached to the current header
    const bulletMatch = line.match(/^[\u2022\u2023\u25E6\u2043\-\*]\s+(.+)/);
    if (bulletMatch && currentHeader) {
      const definition = bulletMatch[1].trim();
      if (definition.length > 10) {
        cards.push({ front: `What is a key point about ${currentHeader}?`, back: definition });
      }
      continue;
    }

    // Detect inline "Term: Definition"
    const colonMatch = line.match(/^([A-Z][a-zA-Z0-9\s\-]{2,40})\s*:\s*(.+)$/);
    if (colonMatch) {
      const term = colonMatch[1].trim();
      const def = colonMatch[2].trim();
      if (def.length > 10 && !/^(this|that|it|they)/i.test(term)) {
        if (!/\b(activity|task|question|objective|summary|conclusion|introduction|assignment|homework|agenda|lecture|module|unit|lesson|chapter|instructions)\b/i.test(term.replace(/[^a-zA-Z0-9\s]/g, "").trim())) {
          cards.push({ front: `What is ${term}?`, back: def });
          currentHeader = term; // Set as header for following bullets
        }
      }
      continue;
    }
  }

  // 2. PDF Line-Break Repair for NLP Parsing
  let cleanText = text.replace(/([^.?!])\n+/g, "$1 ").replace(/\n+/g, " ");
  cleanText = cleanText.replace(/\s+/g, " ").trim();

  // Use compromise to parse sentences
  const doc = nlp(cleanText);
  const sentences = doc.sentences().out("array") as string[];

  sentences.forEach((sentence) => {
    // Strict Length Constraints
    if (sentence.length < 20 || sentence.length > 200) return;

    // A. Explicit Glossary / Definition Pattern (e.g. "Term: Definition" or "Term - Definition")
    const glossaryMatch = sentence.match(
      /^([A-Z][a-zA-Z0-9\s\-]{2,30})\s*(:| - |—)\s*(.+)$/
    );
    if (glossaryMatch) {
      const term = glossaryMatch[1].trim();
      const definition = glossaryMatch[3].replace(/\.$/, "").trim();

      if (
        !/^(this|that|it|they|these|those|he|she)\b/i.test(term) &&
        definition.length > 5
      ) {
        if (!/\b(activity|task|question|objective|summary|conclusion|introduction|assignment|homework|agenda|lecture|module|unit|lesson|chapter|instructions)\b/i.test(term.replace(/[^a-zA-Z0-9\s]/g, "").trim())) {
          cards.push({ front: `What is ${term}?`, back: definition });
        }
        return;
      }
    }

    // B. Question & Answer Detection
    if (sentence.trim().endsWith("?")) {
      const idx = sentences.indexOf(sentence);
      if (idx !== -1 && idx < sentences.length - 1) {
        const nextSentence = sentences[idx + 1];
        if (
          !nextSentence.trim().endsWith("?") &&
          nextSentence.length > 15 &&
          nextSentence.length < 150
        ) {
          if (
            !/^(this|that|it|they|these|those|he|she)\b/i.test(
              nextSentence.trim()
            )
          ) {
            cards.push({ front: sentence.trim(), back: nextSentence.trim() });
            return;
          }
        }
      }
    }

    // C. Relaxed Definition Triggers
    const factMatch = sentence.match(
      /^(.+?)\s+(is|are|was|were|is defined as|refers to|is known as|means|stands for)\s+(.+)$/i
    );
    if (factMatch) {
      let subject = factMatch[1].trim();
      const verb = factMatch[2].toLowerCase().trim();
      const predicate = factMatch[3].replace(/\.$/, "").trim();

      subject = subject
        .replace(/^(this|that|these|those)\s+/i, "")
        .replace(/\s+(this|that|it|they)$/i, "")
        .trim();

      if (
        /^(this|that|it|its|they|these|those|he|she|there|what|which|who|here)\b/i.test(
          subject
        )
      )
        return;
      if (subject.includes("?")) return;

      if (subject.length > 2 && subject.length < 50 && predicate.length > 10) {
        let verbToUse = verb;
        if (["means", "stands for", "refers to"].includes(verb))
          verbToUse = "does";

        let front = `What ${verbToUse} ${subject} ${
          verb === "means"
            ? "mean"
            : verb === "stands for"
            ? "stand for"
            : verb === "refers to"
            ? "refer to"
            : ""
        }?`
          .replace(/\s+\?/, "?")
          .replace(/\s+/g, " ");

        front = front.charAt(0).toUpperCase() + front.slice(1);
        cards.push({ front, back: predicate });
      }
    }
  });

  // Deduplicate by front text
  const uniqueCards = Array.from(
    new Map(cards.map((c) => [c.front, c])).values()
  );
  return uniqueCards.slice(0, 25);
}

// ─── Format Sanitizer / Checker ──────────────────────────────────────────────
// Cleans formatting artifacts and drops broken cards. Does NOT remove real words.
function sanitizeCards(cards: RawCard[]): RawCard[] {
  return cards
    .map((card) => {
      let cleanFront = card.front
        .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "") // Strip leading bullets
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")       // Remove control chars
        .replace(/\s+/g, " ")                                      // Normalize spaces
        .trim();
        
      // Strip weird trailing punctuation from the front (like colons before question marks)
      cleanFront = cleanFront.replace(/:\?$/, "?").replace(/:$/, "");

      let cleanBack = card.back
        .replace(/^[\s•\-\*\u2022\u2023\u25E6\u2043\u2219]+/, "")
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .replace(/\s+/g, " ")
        .trim();

      // Fix "Wall of Text" by truncating to the first sentence if it's too long
      if (cleanBack.length > 150) {
        const firstSentenceMatch = cleanBack.match(/^.*?[.!?](?:\s|$)/);
        if (firstSentenceMatch && firstSentenceMatch[0].length > 20) {
          cleanBack = firstSentenceMatch[0].trim();
        } else {
          cleanBack = cleanBack.slice(0, 147).trim() + "...";
        }
      }

      return { front: cleanFront, back: cleanBack };
    })
    .filter((card) => {
      // Drop cards with empty or too-short content
      if (card.front.length < 3 || card.back.length < 3) return false;
      // Drop cards where front is excessively long (likely a paragraph, not a question)
      if (card.front.length > 200) return false;
      // Drop cards where back is excessively long (walls of text)
      if (card.back.length > 500) return false;
      // Drop cards that are just numbers or page markers
      if (/^\d+$/.test(card.front) || /^page\s*\d+$/i.test(card.front))
        return false;
      // Drop cards that are just author/group attributions
      if (/^(by|prepared by|presented by|submitted by|group)\s+[a-z0-9\s]+$/i.test(card.back))
        return false;
      return true;
    });
}

// ─── API Route Handler ───────────────────────────────────────────────────────
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attachmentId, courseId, save, deckTitle } = body as {
      attachmentId: string;
      courseId: string;
      save?: boolean;
      deckTitle?: string;
      cards?: RawCard[];
    };

    if (!attachmentId || !courseId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // ── Save mode: the frontend already has the cards, just persist them ──
    if (save && body.cards) {
      const cardsToSave = body.cards as RawCard[];
      if (cardsToSave.length === 0) {
        return NextResponse.json(
          { message: "No cards to save" },
          { status: 400 }
        );
      }

      const deck = await db.flashcardDeck.create({
        data: {
          title: deckTitle || "Auto-Generated Flashcards",
          description: `Generated from course material`,
          creatorId: session.user.id,
          instituteId: (session.user as Record<string, unknown>).instituteId as string,
          courseId: courseId,
          cards: {
            create: cardsToSave.map((card, index) => ({
              front: card.front,
              back: card.back,
              orderIndex: index,
            })),
          },
        },
      });

      return NextResponse.json({ deckId: deck.id, saved: true }, { status: 201 });
    }

    // ── Preview mode: parse the file and return the cards for editing ──
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json(
        { message: "Not enrolled in this course" },
        { status: 403 }
      );
    }

    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId },
      include: { syllabusItem: true },
    });

    if (!attachment || attachment.type !== "FILE") {
      return NextResponse.json(
        { message: "Attachment not found or is not a file" },
        { status: 404 }
      );
    }

    // Fetch the file
    let fileUrl = attachment.url;
    if (fileUrl.startsWith("/")) {
      const baseUrl = new URL(req.url).origin;
      fileUrl = `${baseUrl}${fileUrl}`;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch file from storage (Status: ${response.status})`
      );
    }

    const fileNameLower = attachment.fileName.toLowerCase();
    let generatedCards: RawCard[] = [];

    try {
      if (fileNameLower.endsWith(".pptx")) {
        // ── PPTX: Slide-level XML parsing ──
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        generatedCards = parsePptxSlides(buffer);
      } else if (fileNameLower.endsWith(".pdf")) {
        // ── PDF: Rule-based NLP text extraction ──
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = require("pdf-parse/lib/pdf-parse.js");
        const pdfData = await pdfParse(buffer);
        generatedCards = extractFlashcardsFromText(pdfData.text);
      } else if (
        fileNameLower.endsWith(".txt") ||
        fileNameLower.endsWith(".csv")
      ) {
        const rawText = await response.text();
        generatedCards = extractFlashcardsFromText(rawText);
      } else if (fileNameLower.endsWith(".docx")) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const officeparser = require("officeparser");
        const ast = await officeparser.parseOffice(buffer, {
          fileType: "docx" as any,
        });
        generatedCards = extractFlashcardsFromText(ast.toText());
      } else {
        return NextResponse.json(
          {
            message:
              "Unsupported file type. Only .pdf, .pptx, .docx, and .txt files can be converted to flashcards.",
          },
          { status: 400 }
        );
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("Error parsing file:", e);
      return NextResponse.json(
        { message: `Failed to parse file content. Error: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Run the sanitizer / checker
    generatedCards = sanitizeCards(generatedCards);

    if (generatedCards.length === 0) {
      return NextResponse.json(
        {
          message:
            "Could not extract any flashcards from this file. The document may not contain clear definitions, terms, or structured slide content. Try a more text-heavy document.",
        },
        { status: 400 }
      );
    }

    // Return preview JSON — the frontend will display these for editing
    return NextResponse.json({
      cards: generatedCards,
      fileName: attachment.fileName,
      cardCount: generatedCards.length,
    });
  } catch (error) {
    console.error("Auto-generate flashcards error:", error);
    return NextResponse.json(
      { message: "Internal server error" },
      { status: 500 }
    );
  }
}
