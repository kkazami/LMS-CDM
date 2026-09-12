import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import PrivacyClient from "./client";

export const dynamic = "force-dynamic";

export default async function PrivacySettingsPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const session = await getSession();
  const { institute } = await params;

  if (!session?.user?.id) {
    redirect(`/login?institute=${institute}`);
  }

  // Fetch active sessions for the user, ordered by most recent first
  const activeSessions = await db.session.findMany({
    where: {
      userId: session.user.id,
      expiresAt: {
        gt: new Date(), // Only get non-expired sessions
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between space-y-2 mb-8">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Account Security & Privacy</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">
            Manage your password, review active sessions, and control your data.
          </p>
        </div>
      </div>

      <PrivacyClient 
        sessions={activeSessions.map(s => ({
          ...s,
          createdAt: s.createdAt.toISOString(),
          expiresAt: s.expiresAt.toISOString(),
        }))} 
        currentSessionId={session.id} // Pass current session to prevent self-revocation accidentally
      />
    </div>
  );
}
