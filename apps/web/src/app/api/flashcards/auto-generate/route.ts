import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import nlp from "compromise";
import officeparser from "officeparser";

// Helper function to extract flashcards from raw text using rules
function extractFlashcards(text: string) {
  const cards: { front: string; back: string }[] = [];
  
  // 1. PDF Line-Break Repair
  // Merge lines that don't end in punctuation to reconstruct sentences broken across pages
  let cleanText = text.replace(/([^.?!])\n+/g, '$1 ').replace(/\n+/g, ' ');
  // Remove multiple spaces
  cleanText = cleanText.replace(/\s+/g, ' ').trim();

  // Use compromise to parse sentences
  const doc = nlp(cleanText);
  const sentences = doc.sentences().out('array') as string[];

  sentences.forEach((sentence) => {
    // 2. Strict Length Constraints
    // Reject anything too short (likely a header/page number) or too long (massive run-on paragraph)
    if (sentence.length < 20 || sentence.length > 200) return;

    // A. Explicit Glossary / Definition Pattern (e.g. "Term: Definition" or "Term - Definition")
    const glossaryMatch = sentence.match(/^([A-Z][a-zA-Z0-9\s\-]{2,30})\s*(:| - |—)\s*(.+)$/);
    if (glossaryMatch) {
      const term = glossaryMatch[1].trim();
      const definition = glossaryMatch[3].replace(/\.$/, '').trim();
      
      // Banish junk pronouns as Terms
      if (!/^(this|that|it|they|these|those|he|she)\b/i.test(term) && definition.length > 5) {
        cards.push({ front: `What is ${term}?`, back: definition });
        return;
      }
    }

    // B. Question & Answer Detection
    // If a sentence ends in a question mark, see if the next sentence answers it.
    if (sentence.trim().endsWith('?')) {
      const idx = sentences.indexOf(sentence);
      if (idx !== -1 && idx < sentences.length - 1) {
        const nextSentence = sentences[idx + 1];
        if (!nextSentence.trim().endsWith('?') && nextSentence.length > 15 && nextSentence.length < 150) {
          // Exclude if next sentence starts with a junk pronoun
          if (!/^(this|that|it|they|these|those|he|she)\b/i.test(nextSentence.trim())) {
             cards.push({ front: sentence.trim(), back: nextSentence.trim() });
             return;
          }
        }
      }
    }

    // C. Relaxed Definition Triggers (Middle-ground)
    // We include 'is' and 'are' so we get more flashcards, but keep the pronoun ban to block junk.
    const factMatch = sentence.match(/^(.+?)\s+(is|are|was|were|is defined as|refers to|is known as|means|stands for)\s+(.+)$/i);
    if (factMatch) {
      let subject = factMatch[1].trim();
      let verb = factMatch[2].toLowerCase().trim();
      let predicate = factMatch[3].replace(/\.$/, '').trim();
      
      // Clean up common leading words and dangling words
      subject = subject.replace(/^(this|that|these|those)\s+/i, '').replace(/\s+(this|that|it|they)$/i, '').trim();
      
      // Banish "Junk" Pronouns (Expanded to catch "Its", "There", "What")
      if (/^(this|that|it|its|they|these|those|he|she|there|what|which|who|here)\b/i.test(subject)) return;

      // Ensure subject is clean (no weird question marks inside it)
      if (subject.includes('?')) return;

      if (subject.length > 2 && subject.length < 50 && predicate.length > 10) {
        // Formulate question
        let verbToUse = verb;
        if (['means', 'stands for', 'refers to'].includes(verb)) verbToUse = 'does';
        
        let front = `What ${verbToUse} ${subject} ${verb === 'means' ? 'mean' : verb === 'stands for' ? 'stand for' : verb === 'refers to' ? 'refer to' : ''}?`.replace(/\s+\?/, '?').replace(/\s+/g, ' ');
        
        // Capitalize first letter of question
        front = front.charAt(0).toUpperCase() + front.slice(1);
        
        cards.push({ front, back: predicate });
      }
    }
  });

  // Return a unique subset to avoid duplicate cards
  const uniqueCards = Array.from(new Map(cards.map(c => [c.front, c])).values());
  // Limit to max 25 cards
  return uniqueCards.slice(0, 25);
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { attachmentId, courseId } = body;

    if (!attachmentId || !courseId) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    // Check enrollment
    const enrollment = await db.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId: session.user.id },
      },
    });

    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json({ message: "Not enrolled in this course" }, { status: 403 });
    }

    // Get attachment
    const attachment = await db.attachment.findUnique({
      where: { id: attachmentId },
      include: { syllabusItem: true },
    });

    if (!attachment || attachment.type !== 'FILE') {
      return NextResponse.json({ message: "Attachment not found or is not a file" }, { status: 404 });
    }

    // Fetch the file from the URL
    let fileUrl = attachment.url;
    if (fileUrl.startsWith('/')) {
      const baseUrl = new URL(req.url).origin;
      fileUrl = `${baseUrl}${fileUrl}`;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch file from storage (Status: ${response.status})`);
    }

    const fileNameLower = attachment.fileName.toLowerCase();
    let rawText = "";

    try {
      if (fileNameLower.endsWith('.txt') || fileNameLower.endsWith('.csv')) {
        rawText = await response.text();
      } else if (fileNameLower.endsWith('.pdf')) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = require("pdf-parse");
        const pdfData = await pdfParse(buffer);
        rawText = pdfData.text;
      } else if (fileNameLower.endsWith('.pptx') || fileNameLower.endsWith('.docx') || fileNameLower.endsWith('.xlsx')) {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        let ext = "";
        if (fileNameLower.endsWith('.pptx')) ext = "pptx";
        else if (fileNameLower.endsWith('.docx')) ext = "docx";
        else if (fileNameLower.endsWith('.xlsx')) ext = "xlsx";
        
        const ast = await officeparser.parseOffice(buffer, { fileType: ext as any });
        rawText = ast.toText();
      } else {
        return NextResponse.json({ message: "Unsupported file type for flashcard generation" }, { status: 400 });
      }
    } catch (e: any) {
      console.error("Error parsing file:", e);
      return NextResponse.json({ message: `Failed to parse file content. Error: ${e.message || String(e)}` }, { status: 500 });
    }

    if (!rawText || rawText.trim().length === 0) {
      return NextResponse.json({ message: "No readable text found in this file" }, { status: 400 });
    }

    // Process rules
    const generatedCards = extractFlashcards(rawText);

    if (generatedCards.length === 0) {
      return NextResponse.json({ message: "Could not find any suitable definitions or Q&A in this file. Try a more text-heavy document." }, { status: 400 });
    }

    // Save to Database
    const deck = await db.flashcardDeck.create({
      data: {
        title: `${attachment.fileName.split('.')[0]} Flashcards`,
        description: `Auto-generated from ${attachment.fileName}`,
        creatorId: session.user.id,
        instituteId: session.user.instituteId,
        courseId: courseId,
        cards: {
          create: generatedCards.map((card, index) => ({
            front: card.front,
            back: card.back,
            orderIndex: index,
          })),
        },
      },
    });

    return NextResponse.json({ deckId: deck.id }, { status: 200 });
  } catch (error) {
    console.error("Auto-generate flashcards error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
