import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { checkKxEligibility } from "@/lib/kx-eligibility";
import { slugify } from "@/features/knowledge-exchange/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Forbidden: Knowledge Exchange is exclusive to ICS." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  const where = category ? { category: category.toUpperCase() } : {};

  const tags = await db.kxTag.findMany({
    where,
    orderBy: [{ postCount: "desc" }, { name: "asc" }],
  });

  return NextResponse.json({ tags });
}

export async function POST(request: Request) {
  const eligibility = await checkKxEligibility(request);
  if (!eligibility) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!eligibility.eligible) {
    return NextResponse.json(
      { error: "Forbidden: Knowledge Exchange is exclusive to ICS." },
      { status: 403 }
    );
  }

  // RBAC check: only instructors and administrators can create tags
  const isInstructorOrAdmin =
    eligibility.role === "INSTRUCTOR" || eligibility.role === "ADMIN";
  if (!isInstructorOrAdmin) {
    return NextResponse.json(
      { error: "Forbidden: Only instructors and administrators can create tags." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const description =
      typeof body.description === "string" ? body.description.trim() : "";
    let category =
      typeof body.category === "string"
        ? body.category.toUpperCase().trim()
        : "TOPIC";

    if (!["CPE", "IT", "TOPIC", "GENERAL"].includes(category)) {
      category = "TOPIC";
    }

    if (!name || name.length < 2 || name.length > 40) {
      return NextResponse.json(
        { error: "Tag name must be between 2 and 40 characters." },
        { status: 400 }
      );
    }

    if (description.length > 300) {
      return NextResponse.json(
        { error: "Tag description must not exceed 300 characters." },
        { status: 400 }
      );
    }

    const slug = slugify(name);
    if (!slug) {
      return NextResponse.json(
        { error: "Invalid tag name: unable to generate slug." },
        { status: 400 }
      );
    }

    // Check if tag name or slug already exists (case-insensitive)
    const existing = await db.kxTag.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: "insensitive" } },
          { slug: { equals: slug, mode: "insensitive" } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Tag "${name}" already exists.` },
        { status: 409 }
      );
    }

    const tag = await db.kxTag.create({
      data: {
        name,
        slug,
        description,
        category,
        postCount: 0,
      },
    });

    return NextResponse.json(
      {
        success: true,
        tag: {
          id: tag.id,
          name: tag.name,
          slug: tag.slug,
          category: tag.category,
          postCount: tag.postCount,
          description: tag.description,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create tag:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the tag." },
      { status: 500 }
    );
  }
}

