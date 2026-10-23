import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import ArenaJoinClient from "@/components/arena/ArenaJoinClient";

export const dynamic = "force-dynamic";

export default async function ArenaJoinPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const defaultNickname = (session.user.name as string) || "Player";

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <ArenaJoinClient instituteCode={institute} defaultNickname={defaultNickname} />
    </div>
  );
}
