import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleKxInstituteCode, isEligibleForKnowledgeExchange } from "@/lib/kx-eligibility";

export const dynamic = "force-dynamic";

interface KnowledgeExchangeLayoutProps {
  children: React.ReactNode;
  params: Promise<{ institute: string }>;
}

export default async function KnowledgeExchangeLayout({
  children,
  params,
}: KnowledgeExchangeLayoutProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Guard route institute parameter
  if (!isEligibleKxInstituteCode(institute)) {
    redirect(`/${institute}`);
  }

  // 2. Guard user session institute
  const eligible = await isEligibleForKnowledgeExchange({
    user: {
      id: session.user.id,
      role: session.user.role as string,
      instituteId: session.user.instituteId as string,
    },
  });

  if (!eligible) {
    redirect(`/${institute}`);
  }

  return <>{children}</>;
}
