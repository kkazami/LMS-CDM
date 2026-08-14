import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import Link from "next/link";
import { BookOpen, FileText, ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{
    institute: string;
    courseId: string;
  }>;
}

export default async function CourseMaterialsPage({ params }: Props) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const userId = session.user.id;
  const theme = getInstituteTheme(institute);

  // Validate course & enrollment
  const course = await db.course.findUnique({
    where: { id: courseId },
    include: {
      instructor: { select: { name: true } },
    },
  });

  if (!course) redirect(`/${institute}/learning-materials`);

  const enrollment = await db.enrollment.findUnique({
    where: {
      courseId_studentId: { courseId, studentId: userId },
    },
  });

  if (!enrollment || enrollment.status !== "APPROVED") {
    redirect(`/${institute}/learning-materials`);
  }

  // Fetch Materials
  const materials = await db.syllabusItem.findMany({
    where: {
      courseId,
      type: "MATERIAL",
    },
    include: {
      attachments: true,
    },
    orderBy: { orderIndex: "asc" },
  });

  return (
    <div className="page-enter pb-12">
      {/* Hero Header */}
      <div className="relative mb-8 overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl sm:p-12" style={{ background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)` }}>
        {/* Subtle Premium Background */}
        <div className="pointer-events-none absolute inset-0 bg-linear-to-r from-black/20 via-transparent to-black/10" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
        <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        
        <div className="relative z-10 max-w-4xl">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/${institute}/learning-materials`}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition-all hover:bg-white/20 hover:scale-105 active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to All Subjects
            </Link>

            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-bold tracking-widest text-white backdrop-blur-md uppercase shadow-sm border border-white/10">
              {course.code}
            </div>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight drop-shadow-sm sm:text-5xl lg:text-6xl mb-4 leading-tight">
            {course.title}
          </h1>
          <p className="text-lg font-medium text-white/80 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white/50" />
            Prof. {course.instructor?.name || "Unassigned"}
          </p>
        </div>
      </div>

      {materials.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-4xl border-2 border-dashed border-gray-200 bg-white py-24 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-50 mb-6 ring-8 ring-gray-50/50">
            <BookOpen className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-gray-900">No Modules Published</h3>
          <p className="text-base text-gray-500 max-w-md">
            Your professor hasn't uploaded any learning materials for this course yet. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {materials.map((material, index) => {
            return (
              <div key={material.id} className="group relative overflow-hidden rounded-4xl bg-white p-6 sm:p-8 shadow-sm ring-1 ring-gray-100 transition-all duration-300 hover:shadow-xl hover:ring-indigo-200">
                <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500 transition-all duration-300 group-hover:w-3" style={{ backgroundColor: theme.colors.primary }} />
                
                <div className="pl-4 flex flex-col gap-6">
                  {/* Title and Note Section */}
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-50 text-xs font-bold text-indigo-600 ring-1 ring-indigo-100">
                        {index + 1}
                      </span>
                      <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                        {material.title}
                      </h2>
                    </div>
                    
                    {material.description && (
                      <div className="mt-4 rounded-2xl bg-gray-50 p-5 text-sm text-gray-700 leading-relaxed border border-gray-100">
                        <strong className="text-gray-900 font-bold block mb-1.5 uppercase tracking-wider text-xs">Professor's Note</strong>
                        {material.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Section (Proceed to Read) */}
                  <div className="pt-4 border-t border-gray-100">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-gray-400">
                      Learning Documents
                    </h3>
                    
                    {material.attachments.length === 0 ? (
                      <p className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-xl text-center">No files attached to this module.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {material.attachments.map((file) => (
                          <Link
                            href={`/${institute}/learning-materials/${courseId}/${material.id}/read?attachmentId=${file.id}`}
                            key={file.id}
                            className="flex items-center justify-between gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200 transition-all duration-300 hover:-translate-y-1 hover:ring-indigo-500 hover:shadow-lg group/link"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-transform duration-300 group-hover/link:scale-110 group-hover/link:bg-indigo-600 group-hover/link:text-white">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-base font-bold text-gray-900 group-hover/link:text-indigo-600 transition-colors">
                                  {file.fileName || "Document"}
                                </p>
                                <p className="text-xs font-semibold text-gray-500">
                                  {file.type === "FILE" ? "PDF Document" : "External Link"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-50 text-gray-400 transition-all duration-300 group-hover/link:bg-indigo-50 group-hover/link:text-indigo-600">
                              <ArrowRight className="h-5 w-5" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
