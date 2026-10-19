import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import FlashcardDashboard from "@/components/flashcards/FlashcardDashboard";

type PageProps = {
  params: Promise<{
    institute: string;
  }>;
};

export default async function FlashcardsPage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // Student-only page
  const role = (session.user.role as string).toUpperCase();
  if (role !== "STUDENT") {
    redirect(`/${institute}`);
  }

  const instituteRecord = await db.institute.findUnique({
    where: { code: institute.toLowerCase() },
    select: { id: true },
  });

  if (!instituteRecord) {
    redirect(`/${institute}`);
  }
  
  const theme = getInstituteTheme(institute);

  // Fetch decks with card counts and progress
  const decks = await db.flashcardDeck.findMany({
    where: {
      creatorId: session.user.id,
      instituteId: instituteRecord.id,
      isArchived: false,
    },
    include: {
      course: { select: { title: true } },
      cards: {
        select: {
          id: true,
          progress: {
            where: { userId: session.user.id },
            select: { status: true },
          },
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const serializedDecks = decks.map((deck) => ({
    id: deck.id,
    title: deck.title,
    description: deck.description,
    tags: JSON.parse(deck.tags) as string[],
    color: deck.color,
    courseId: deck.courseId,
    courseTitle: deck.course?.title ?? null,
    creatorId: deck.creatorId,
    instituteId: deck.instituteId,
    isArchived: deck.isArchived,
    cardCount: deck.cards.length,
    correctCount: deck.cards.filter(
      (c) => c.progress.length > 0 && c.progress[0].status === "correct"
    ).length,
    createdAt: deck.createdAt.toISOString(),
    updatedAt: deck.updatedAt.toISOString(),
  }));

  // Fetch course options for the filter/create dropdown
  const courses = await db.course.findMany({
    where: { instituteId: instituteRecord.id },
    select: { id: true, title: true, code: true },
    orderBy: { title: "asc" },
  });

  return (
    <FlashcardDashboard
      instituteCode={institute}
      initialDecks={serializedDecks}
      courseOptions={courses}
      theme={theme}
    />
  );
}
