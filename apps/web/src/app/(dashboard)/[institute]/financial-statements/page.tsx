import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { ensureFinancialStatementTable, isFinancialEligible } from "@/lib/financial-statements/access";
import { MAX_STATEMENTS_PER_STUDENT, toSummary } from "@/lib/financial-statements/server";
import { isStatementType } from "@/lib/financial-statements/types";
import FinancialStatementsHubClient from "@/components/financial-statements/FinancialStatementsHubClient";

export const dynamic = "force-dynamic";

export default async function FinancialStatementsHubPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  // Strictly enforce: Student role only, and IBE institute only.
  // Instructors, admins, and other institutes cannot access this feature.
  if (!isFinancialEligible(session.user) || institute.toLowerCase() !== "ibe") {
    notFound();
  }

  // Load student's own statements
  await ensureFinancialStatementTable().catch(() => {});
  const statements = await db.financialStatement.findMany({
    where: { studentId: session.user.id },
    orderBy: { updatedAt: "desc" },
    take: MAX_STATEMENTS_PER_STUDENT,
  });

  const formattedStatements = statements
    .filter((row) => isStatementType(row.statementType))
    .map(toSummary);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <FinancialStatementsHubClient
        instituteCode={institute}
        initialStatements={formattedStatements}
        studentName={session.user.name || "Student"}
      />
    </div>
  );
}
