import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isFinancialEligible, loadOwnedStatement } from "@/lib/financial-statements/access";
import { toDetail } from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";
import { validateStatement } from "@/lib/financial-statements/validate";
import FinancialStatementEditorClient from "@/components/financial-statements/FinancialStatementEditorClient";

export const dynamic = "force-dynamic";

export default async function FinancialStatementDetailPage({
  params,
}: {
  params: Promise<{ institute: string; id: string }>;
}) {
  const { institute, id } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce: Student role only, and IBE institute only.
  if (!isFinancialEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  // Strictly enforce student ownership: will return null if statement belongs to another student
  const row = await loadOwnedStatement(id, session.user.id);
  if (!row || !isStatementType(row.statementType)) {
    notFound();
  }

  const statement = toDetail(row);
  const issues = validateStatement(statement.statementType, statement.data);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FinancialStatementEditorClient
        instituteCode={institute}
        initialStatement={statement}
        initialIssues={issues}
      />
    </div>
  );
}
