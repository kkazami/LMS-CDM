// POST /api/upload — File upload endpoint

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

export const dynamic = "force-dynamic";

const ALLOWED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
  // Text
  "text/plain",
  "text/csv",
]);

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .substring(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 25 MB.` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json(
        {
          error: `File type "${file.type}" is not allowed. Accepted: PDF, DOCX, PPTX, XLSX, JPG, PNG, GIF, WEBP, ZIP, TXT, CSV.`,
        },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = sanitizeFileName(file.name);
    const uniqueName = `${timestamp}-${safeName}`;

    // 1. Try Vercel Blob if BLOB_READ_WRITE_TOKEN environment variable is present
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(`uploads/${uniqueName}`, file, {
          access: "public",
        });
        return NextResponse.json({
          url: blob.url,
          fileName: file.name,
          fileSize: file.size,
        });
      } catch (blobErr) {
        console.error("Vercel Blob upload failed, trying fallback strategy:", blobErr);
      }
    }

    // 2. Try writing to local filesystem (works in local development environment)
    try {
      const uploadDir = path.join(process.cwd(), "public", "uploads");
      await mkdir(uploadDir, { recursive: true });

      const filePath = path.join(uploadDir, uniqueName);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      return NextResponse.json({
        url: `/uploads/${uniqueName}`,
        fileName: file.name,
        fileSize: file.size,
      });
    } catch (fsErr) {
      console.warn(
        "Local filesystem write failed (read-only filesystem on Vercel), falling back to Data URL:",
        fsErr
      );

      // 3. Fallback for read-only serverless environment (Vercel without Vercel Blob configured)
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = buffer.toString("base64");
      const mimeType = file.type || "application/octet-stream";
      const dataUrl = `data:${mimeType};base64,${base64}`;

      return NextResponse.json({
        url: dataUrl,
        fileName: file.name,
        fileSize: file.size,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
