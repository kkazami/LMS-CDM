import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireWorkspaceSession } from "../../workspace/_shared";
import AdmZip from "adm-zip";

export const dynamic = "force-dynamic";

/**
 * GET /api/flashcards/file-info?attachmentId=...
 *
 * Returns the total page/slide count and slide titles for the page-selector UI
 * shown before flashcard generation. Supports PDF and PPTX only.
 * TXT / DOCX / CSV return { fileType: "unsupported" } so the UI skips the selector.
 */
export async function GET(request: Request) {
  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ message: "Missing attachmentId" }, { status: 400 });
  }

  // Fetch attachment record
  const attachment = await db.attachment.findUnique({
    where: { id: attachmentId },
    include: { syllabusItem: { include: { course: true } } },
  });

  if (!attachment || attachment.type !== "FILE") {
    return NextResponse.json({ message: "Attachment not found" }, { status: 404 });
  }

  // Verify student is enrolled in the course
  const courseId = attachment.syllabusItem?.courseId;
  if (courseId) {
    const enrollment = await db.enrollment.findUnique({
      where: { courseId_studentId: { courseId, studentId: session.user.id } },
    });
    if (!enrollment || enrollment.status !== "APPROVED") {
      return NextResponse.json({ message: "Not enrolled" }, { status: 403 });
    }
  }

  const fileNameLower = attachment.fileName.toLowerCase();

  // Resolve absolute URL for the file
  let fileUrl = attachment.url;
  if (fileUrl.startsWith("/")) {
    const origin = new URL(request.url).origin;
    fileUrl = `${origin}${fileUrl}`;
  }

  try {
    if (fileNameLower.endsWith(".pptx")) {
      // ── PPTX: count slides + extract first-title from each ──
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const zip = new AdmZip(buffer);

      interface SlideEntry { entryName: string; getData: () => Buffer }
      const slideEntries: SlideEntry[] = (zip.getEntries() as SlideEntry[])
        .filter((e) => /^ppt\/slides\/slide\d+\.xml$/i.test(e.entryName))
        .sort((a, b) => {
          const numOf = (name: string) =>
            parseInt(name.match(/slide(\d+)/i)?.[1] ?? "0", 10);
          return numOf(a.entryName) - numOf(b.entryName);
        });

      const slideTitles: string[] = slideEntries.map((entry) => {
        const xml = entry.getData().toString("utf8");
        // Extract title shape text
        const shapeBlocks = xml.match(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/gi) ?? [];
        for (const shape of shapeBlocks) {
          if (/<p:ph[^>]*type\s*=\s*"(title|ctrTitle)"/i.test(shape)) {
            const textNodes = shape.match(/<a:t>([^<]*)<\/a:t>/gi) ?? [];
            const title = textNodes
              .map((t) => t.replace(/<\/?a:t>/gi, ""))
              .join(" ")
              .trim();
            if (title) return title;
          }
        }
        return ""; // Untitled slide
      });

      return NextResponse.json({
        fileType: "pptx",
        totalSlides: slideEntries.length,
        totalPages: null,
        slideTitles,
      });
    }

    if (fileNameLower.endsWith(".pdf")) {
      // ── PDF: get total page count from metadata ──
      const res = await fetch(fileUrl);
      if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
      const buffer = Buffer.from(await res.arrayBuffer());
      const pdfParse = require("pdf-parse/lib/pdf-parse.js");

      // Only parse metadata (no text render) to get page count quickly
      let totalPages = 0;
      await pdfParse(buffer, {
        pagerender: (_pageData: unknown) => {
          // Count pages without rendering text
          return Promise.resolve("");
        },
      }).then((data: { numpages: number }) => {
        totalPages = data.numpages;
      });

      return NextResponse.json({
        fileType: "pdf",
        totalSlides: null,
        totalPages,
        slideTitles: null,
      });
    }

    // TXT, DOCX, CSV — no structured page boundaries
    return NextResponse.json({
      fileType: "unsupported",
      totalSlides: null,
      totalPages: null,
      slideTitles: null,
    });
  } catch (err) {
    console.error("file-info error:", err);
    return NextResponse.json(
      { message: "Failed to inspect file" },
      { status: 500 }
    );
  }
}
