import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import ArenaPlayerClient from "@/components/arena/ArenaPlayerClient";

export const dynamic = "force-dynamic";

export default async function ArenaPlayPage({
  params,
}: {
  params: Promise<{ institute: string; sessionId: string }>;
}) {
  const { institute, sessionId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const gameSession = await db.arenaGameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, status: true },
  });

  if (!gameSession) {
    notFound();
  }

  // Ensure student participant record exists
  let participant = await db.arenaParticipant.findUnique({
    where: {
      sessionId_studentId: {
        sessionId,
        studentId: session.user.id,
      },
    },
  });

  if (!participant) {
    participant = await db.arenaParticipant.create({
      data: {
        sessionId,
        studentId: session.user.id,
        nickname: (session.user.name as string) || "Player",
        isConnected: true,
      },
    });
  } else {
    await db.arenaParticipant.update({
      where: { id: participant.id },
      data: { isConnected: true, lastActiveAt: new Date() },
    });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <ArenaPlayerClient
        sessionId={sessionId}
        instituteCode={institute}
        currentUserId={session.user.id}
      />
    </div>
  );
}
