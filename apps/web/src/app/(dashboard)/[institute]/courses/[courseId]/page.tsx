import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { notFound, redirect } from "next/navigation";
import KxRelatedWidget from "@/features/knowledge-exchange/components/KxRelatedWidget";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function CourseInteriorPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { id: true, code: true, title: true, description: true },
  });

  if (!course) {
    notFound();
  }

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-6">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
        <p className="text-sm text-muted-foreground font-mono mt-0.5">{course.code}</p>
        {course.description && (
          <p className="text-sm text-muted-foreground mt-2">{course.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-xs">
            <h2 className="text-base font-semibold text-foreground mb-2">Course Information</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Welcome to the course portal. Navigate between Stream, Classwork, and Grades using the tabs above.
              Use the Knowledge Exchange widget on the right to participate in course discussions or ask questions.
            </p>
          </div>
        </div>

        <div>
          <KxRelatedWidget
            courseId={course.id}
            courseCode={course.code}
            instituteCode={institute}
          />
        </div>
      </div>
    </div>
  );
}
