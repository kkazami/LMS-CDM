// POST /api/upload — File upload endpoint

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import path from "path";
import { writeFile, mkdir } from "fs/promises";

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

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Write the file
    const filePath = path.join(uploadDir, uniqueName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json({
      url: `/uploads/${uniqueName}`,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file." },
      { status: 500 }
    );
  }
}
