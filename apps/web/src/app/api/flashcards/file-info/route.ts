import { requireMaterialAttachment } from '@/lib/material-access';
import { readAttachment } from '@/lib/attachment-content';
import { withMaterialPdf } from '@/lib/material-pdf';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';
import { denyLegacyApi } from '@/lib/super-user-v1/legacy-entry-guard';
import { NextResponse } from "next/server";
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
  const ceilingDenial = await denyLegacyApi(request, "GET flashcards/file-info/route.ts");
  if (ceilingDenial) return ceilingDenial;

  const { session, response } = await requireWorkspaceSession();
  if (response) return response;

  const url = new URL(request.url);
  const attachmentId = url.searchParams.get("attachmentId");

  if (!attachmentId) {
    return NextResponse.json({ message: "Missing attachmentId" }, { status: 400 });
  }

  try {
    const attachment = await requireMaterialAttachment(session.user, attachmentId);
    const fileNameLower = attachment.fileName.toLowerCase();
    if (fileNameLower.endsWith(".pptx")) {
      // ── PPTX: count slides + extract first-title from each ──
      const buffer = await readAttachment(attachment.url);
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
      const buffer = await readAttachment(attachment.url);
      const totalPages = await withMaterialPdf(buffer, pdf => pdf.numPages);

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
  } catch (error) {
    if (error instanceof AccessError) return accountErrorResponse(error);
    return NextResponse.json({ message: 'File details could not be read. Try again or open the original.' }, { status: 503 });
  }
}
