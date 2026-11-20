import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { resolveIbeStudentProgram } from "@/lib/ibe-programs/registration";
import { isWordWiseEligible } from "@/lib/wordwise/eligibility";
import { loadWordWisePayloadForStudent } from "@/lib/wordwise/server-db";
import WordWiseHubClient from "@/components/wordwise/WordWiseHubClient";

export const dynamic = "force-dynamic";

export default async function IbeWordWisePage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const instituteSlug = institute.toLowerCase();

  // Only IBE offers the WordWise – Vocabulary & Academic Language Hub
  if (instituteSlug !== "ibe") {
    notFound();
  }

  const session = await getSession();
  if (!session?.user) {
    redirect(`/login?institute=${institute}`);
  }

  const { user } = session;
  if (
    (user.role ?? "").toUpperCase() !== "STUDENT" ||
    (user.institute?.code ?? "").toLowerCase() !== "ibe"
  ) {
    notFound();
  }

  const resolvedProgram = await resolveIbeStudentProgram(user.id);

  if (
    !isWordWiseEligible({
      role: user.role,
      instituteCode: user.institute?.code ?? null,
      programCode: resolvedProgram?.programCode ?? null,
    })
  ) {
    redirect("/ibe/students");
  }

  const initialData = await loadWordWisePayloadForStudent({
    studentId: user.id,
    studentName: user.name || "Student",
    programCode: resolvedProgram?.programCode ?? "BSBA HRM",
    programName:
      resolvedProgram?.programName ??
      "BS Business Administration Major in Human Resource Management",
  });

  return (
    <div className="max-w-7xl mx-auto py-1 sm:py-4">
      <WordWiseHubClient initialData={initialData} />
    </div>
  );
}
