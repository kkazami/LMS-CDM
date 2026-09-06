import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import { db } from "@/lib/db";
import ProfileEditClient from "./client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ institute: string }>;
};

export default async function ProfilePage({ params }: PageProps) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) redirect(`/login?institute=${institute}`);

  const theme = getInstituteTheme(institute);

  const user = await db.user.findUnique({
    where: { id: session.user.id },
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
      gamificationProfile: {
        select: {
          exp: true,
          level: true,
          levelTier: true,
          loginStreakCurrent: true,
          loginStreakLongest: true,
          totalLoginDays: true,
          badges: {
            select: { badgeRuleId: true, earnedAt: true },
            orderBy: { earnedAt: "desc" },
            take: 6,
          },
        },
      },
    },
  });

  if (!user) redirect(`/${institute}`);

  const serializedUser = {
    ...user,
    createdAt: user.createdAt.toISOString(),
    gamificationProfile: user.gamificationProfile
      ? {
          ...user.gamificationProfile,
          badges: user.gamificationProfile.badges.map((b) => ({
            badgeRuleId: b.badgeRuleId,
            earnedAt: b.earnedAt.toISOString(),
          })),
        }
      : null,
  };

  return (
    <ProfileEditClient
      user={serializedUser}
      instituteCode={institute}
      theme={theme}
    />
  );
}
