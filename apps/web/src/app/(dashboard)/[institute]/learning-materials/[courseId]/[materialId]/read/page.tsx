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
      <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-4">
        <div className="flex items-center gap-4">
          <Link
            href={`/${institute}/learning-materials/${courseId}`}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-500 transition-colors hover:bg-gray-200 hover:text-gray-900"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">
              {material.title}
            </h1>
            <p className="text-sm font-medium text-gray-500">
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
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-gray-500">
              Focus Mode
            </h3>
            <PomodoroTimer 
              courseId={courseId} 
              syllabusItemId={materialId} 
            />
          </div>

          {/* Module Resources List */}
          {material.attachments.length > 1 && (
            <div className="rounded-3xl bg-gray-50 p-6 border border-gray-200">
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-gray-500">
                Other Files in Module
              </h3>
              <div className="space-y-2">
                {material.attachments.map((file) => (
                  <Link
                    href={`/${institute}/learning-materials/${courseId}/${materialId}/read?attachmentId=${file.id}`}
                    key={file.id}
                    className={`block rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      file.id === activeAttachment.id
                        ? "bg-indigo-600 text-white shadow-md"
                        : "bg-white text-gray-700 shadow-sm hover:bg-gray-100"
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
