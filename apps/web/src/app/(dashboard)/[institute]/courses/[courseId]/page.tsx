import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ institute: string; courseId: string }>;
};

export default async function CourseInteriorPage({ params }: PageProps) {
  const { institute, courseId } = await params;
  redirect(`/${institute}/courses/${courseId}/stream`);
}
