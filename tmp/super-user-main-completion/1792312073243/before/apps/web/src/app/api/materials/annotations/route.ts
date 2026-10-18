import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const attachmentId = url.searchParams.get("attachmentId");

    if (!attachmentId) {
      return NextResponse.json(
        { message: "Missing attachmentId parameter." },
        { status: 400 }
      );
    }

    const annotations = await db.materialAnnotation.findMany({
      where: {
        attachmentId,
        userId: session.user.id,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(annotations);
  } catch (error) {
    console.error("Error fetching annotations:", error);
    return NextResponse.json(
      { message: "Failed to fetch annotations." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { attachmentId, quote, noteContent, color, positionMetadata } = body;

    if (!attachmentId || !quote) {
      return NextResponse.json(
        { message: "Missing required fields." },
        { status: 400 }
      );
    }

    const annotation = await db.materialAnnotation.create({
      data: {
        userId: session.user.id,
        attachmentId,
        quote,
        noteContent: noteContent || "",
        color: color || "yellow",
        positionMetadata: positionMetadata ? JSON.stringify(positionMetadata) : "{}",
      },
    });

    return NextResponse.json(annotation);
  } catch (error) {
    console.error("Error creating annotation:", error);
    return NextResponse.json(
      { message: "Failed to create annotation." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "Missing id parameter." },
        { status: 400 }
      );
    }

    // Ensure the annotation belongs to the user
    const existing = await db.materialAnnotation.findUnique({
      where: { id },
    });

    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ message: "Not found or unauthorized." }, { status: 404 });
    }

    await db.materialAnnotation.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    return NextResponse.json(
      { message: "Failed to delete annotation." },
      { status: 500 }
    );
  }
}
