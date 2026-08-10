import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import PublicProfileClient from "./client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ institute: string; userId: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { institute, userId } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      studentNumber: true,
      uniqueId: true,
      avatarUrl: true,
      bio: true,
      phone: true,
      department: true,
      yearLevel: true,
      coverColor: true,
      createdAt: true,
      institute: { select: { code: true, name: true } },
      taughtCourses: {
        where: { isArchived: false },
        select: { id: true, title: true, code: true },
        take: 5,
      },
      enrollments: {
        where: { status: "APPROVED" },
        select: { course: { select: { id: true, title: true, code: true } } },
        take: 5,
      },
    },
  });

  if (!user || user.institute.code !== institute) {
    redirect(`/${institute}`);
  }

  const isOwnProfile = session.user.id === userId;

  // Serialize dates
  const serializedUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
  };

  return (
    <PublicProfileClient
      user={serializedUser}
      isOwnProfile={isOwnProfile}
      instituteCode={institute}
      theme={theme}
    />
  );
}
