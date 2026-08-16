import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import DocumentViewerDynamic from "@/components/learning-materials/DocumentViewerDynamic";
import PomodoroTimer from "@/components/learning-materials/PomodoroTimer";
import FocusSidebar from "@/components/learning-materials/FocusSidebar";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    institute: string;
    courseId: string;
    materialId: string;
  }>;
  searchParams: Promise<{
    attachmentId?: string;
  }>;
}

export default async function ReadingScreenPage({ params, searchParams }: Props) {
  const { institute, courseId, materialId } = await params;
  const { attachmentId } = await searchParams;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const userId = session.user.id;
  const theme = getInstituteTheme(institute);

  // Validate course & enrollment
  const enrollment = await db.enrollment.findUnique({
    where: {
      courseId_studentId: { courseId, studentId: userId },
    },
    include: { course: true }
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect(`/${institute}/learning-materials`);
  }

  // Fetch Material and its attachments
  const material = await db.syllabusItem.findUnique({
    where: { id: materialId },
    include: {
      attachments: true,
    },
  });

  if (!material || material.courseId !== courseId || material.type !== "MATERIAL") {
    redirect(`/${institute}/learning-materials/${courseId}`);
  }

  // Determine which attachment to show
  let activeAttachment = material.attachments[0];
  if (attachmentId) {
    const found = material.attachments.find((a) => a.id === attachmentId);
    if (found) activeAttachment = found;
  }

  if (!activeAttachment) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center">
        <h2 className="text-xl font-bold">No file available for this module.</h2>
        <Link href={`/${institute}/learning-materials/${courseId}`} className="mt-4 text-indigo-600 hover:underline">
          Go back to course materials
        </Link>
      </div>
    );
  }

  return (
    <div className="page-enter flex flex-col h-[calc(100vh-8rem)]">
      {/* Header bar */}
      <div className="mb-4 flex items-center justify-between border-b border-slate-200/80 dark:border-white/10 pb-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${institute}/learning-materials/${courseId}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 dark:bg-[#1E2132] text-slate-500 dark:text-[#8B92A5] transition-colors hover:bg-slate-200 dark:hover:bg-[#25293C] hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-[#F0F2F8] leading-tight">
              {material.title}
            </h1>
            <p className="text-sm font-medium text-slate-500 dark:text-[#8B92A5]">
              {enrollment.course.code} • {activeAttachment.fileName || "Document"}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col xl:flex-row gap-6 min-h-0">
        {/* Left Column: PDF Viewer + Notes */}
        <div className="flex-1 min-h-0 min-w-0">
          <DocumentViewerDynamic 
            url={activeAttachment.url} 
            attachmentId={activeAttachment.id} 
            userId={userId}
            type={activeAttachment.type}
            fileName={activeAttachment.fileName}
          />
        </div>

        {/* Right Column: Pomodoro & Module Resources */}
        <FocusSidebar>
          {/* Pomodoro Timer */}
          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Focus Mode
            </h3>
            <PomodoroTimer 
              courseId={courseId} 
              syllabusItemId={materialId} 
            />
          </div>

          {/* Module Resources List */}
          {material.attachments.length > 1 && (
            <div className="rounded-3xl bg-white dark:bg-[#141721] p-6 border border-slate-200/80 dark:border-white/5 shadow-xs">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Other Files in Module
              </h3>
              <div className="space-y-2">
                {material.attachments.map((file) => (
                  <Link
                    href={`/${institute}/learning-materials/${courseId}/${materialId}/read?attachmentId=${file.id}`}
                    key={file.id}
                    className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      file.id === activeAttachment.id
                        ? "bg-[#F97316] text-white shadow-xs"
                        : "bg-slate-50 dark:bg-[#181B26] text-slate-700 dark:text-[#8B92A5] border border-slate-200/80 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-[#1E2132] hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    {file.fileName || "Document"}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </FocusSidebar>
      </div>
    </div>
  );
}
