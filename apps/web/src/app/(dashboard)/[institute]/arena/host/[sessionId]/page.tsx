import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { normalizeRole } from "@/lib/admin-types";
import ArenaHostClient from "@/components/arena/ArenaHostClient";

export const dynamic = "force-dynamic";

export default async function ArenaHostPage({
  params,
}: {
  params: Promise<{ institute: string; sessionId: string }>;
}) {
  const { institute, sessionId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const role = normalizeRole(session.user.role as string);
  if (role !== "INSTRUCTOR" && role !== "ADMIN") {
    redirect(`/${institute}/arena`);
  }

  const gameSession = await db.arenaGameSession.findUnique({
    where: { id: sessionId },
    select: { id: true, hostId: true },
  });

  if (!gameSession) {
    notFound();
  }

  if (gameSession.hostId !== session.user.id && role !== "ADMIN") {
    redirect(`/${institute}/arena`);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ArenaHostClient sessionId={sessionId} instituteCode={institute} />
    </div>
  );
}
