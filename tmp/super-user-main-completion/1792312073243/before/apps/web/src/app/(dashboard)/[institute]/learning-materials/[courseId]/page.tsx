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
      <div 
        className="relative mb-8 overflow-hidden rounded-[2.5rem] p-8 text-white shadow-xl sm:p-12 bg-cover bg-center" 
        style={
          course.coverImage 
            ? { backgroundImage: `url("${course.coverImage}")` }
            : { background: `linear-gradient(135deg, ${theme.colors.sidebar} 0%, ${theme.colors.primary} 100%)` }
        }
      >
        {/* Subtle Premium Background */}
        <div className={`pointer-events-none absolute inset-0 ${course.coverImage ? 'bg-gradient-to-r from-black/80 via-black/50 to-black/20' : 'bg-gradient-to-r from-black/20 via-transparent to-black/10'}`} />
        {!course.coverImage && (
          <>
            <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-black/10 blur-3xl" />
            <div className="pointer-events-none absolute -top-24 -left-24 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
          </>
        )}
        
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
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] py-24 text-center shadow-xs">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 dark:bg-[#181B26] mb-6 ring-8 ring-slate-50/50 dark:ring-white/5">
            <BookOpen className="h-10 w-10 text-slate-400 dark:text-[#8B92A5]" />
          </div>
          <h3 className="mb-2 text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">No Modules Published</h3>
          <p className="text-base text-slate-500 dark:text-[#8B92A5] max-w-md">
            Your professor hasn&apos;t uploaded any learning materials for this course yet. Check back later.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {materials.map((material, index) => {
            return (
              <div key={material.id} className="group relative overflow-hidden rounded-3xl bg-white dark:bg-[#141721] p-6 sm:p-8 shadow-xs border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:shadow-lg hover:border-slate-300 dark:hover:border-white/10">
                <div className="absolute left-0 top-0 bottom-0 w-2 transition-all duration-300 group-hover:w-3" style={{ backgroundColor: theme.colors.primary }} />
                
                <div className="pl-4 flex flex-col gap-6">
                  {/* Title and Note Section */}
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-xs font-bold text-[#F97316] ring-1 ring-orange-500/20">
                        {index + 1}
                      </span>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8] tracking-tight">
                        {material.title}
                      </h2>
                    </div>
                    
                    {material.description && (
                      <div className="mt-4 rounded-2xl bg-slate-50 dark:bg-[#181B26] p-5 text-sm text-slate-700 dark:text-[#D1D5DB] leading-relaxed border border-slate-200/80 dark:border-white/5">
                        <strong className="text-slate-900 dark:text-[#F0F2F8] font-bold block mb-1.5 uppercase tracking-wider text-xs">Professor&apos;s Note</strong>
                        {material.description}
                      </div>
                    )}
                  </div>
                  
                  {/* Action Section (Proceed to Read) */}
                  <div className="pt-4 border-t border-slate-100 dark:border-white/5">
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-[#8B92A5]">
                      Learning Documents
                    </h3>
                    
                    {material.attachments.length === 0 ? (
                      <p className="text-sm text-slate-400 dark:text-[#8B92A5] italic bg-slate-50 dark:bg-[#181B26] p-4 rounded-xl text-center border border-slate-200/80 dark:border-white/5">No files attached to this module.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {material.attachments.map((file) => (
                          <Link
                            href={`/${institute}/learning-materials/${courseId}/${material.id}/read?attachmentId=${file.id}`}
                            key={file.id}
                            className="flex items-center justify-between gap-4 rounded-2xl bg-white dark:bg-[#181B26] p-4 shadow-xs border border-slate-200/80 dark:border-white/5 transition-all duration-300 hover:-translate-y-1 hover:border-[#F97316] dark:hover:border-[#F97316] hover:shadow-md group/link"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20 text-[#F97316] transition-transform duration-300 group-hover/link:scale-110">
                                <FileText className="h-6 w-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="truncate text-base font-bold text-slate-900 dark:text-[#F0F2F8] group-hover/link:text-[#F97316] transition-colors">
                                  {file.fileName || "Document"}
                                </p>
                                <p className="text-xs font-semibold text-slate-500 dark:text-[#8B92A5]">
                                  {file.type === "FILE" ? "PDF Document" : "External Link"}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-50 dark:bg-[#1E2132] text-slate-400 dark:text-[#8B92A5] transition-all duration-300 group-hover/link:bg-orange-500/10 group-hover/link:text-[#F97316]">
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
