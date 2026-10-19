import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { db } from "@/lib/db";
import { getInstituteTheme } from "@/lib/get-institute-theme";
import SettingsClient from "./client";

interface Props {
  params: Promise<{
    institute: string;
  }>;
}

export default async function SettingsPage({ params }: Props) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      enrollments: {
        include: {
          course: true,
        },
      },
      taughtCourses: true,
    },
  });

  if (!user) {
    redirect(`/login?institute=${institute}`);
  }

  const theme = getInstituteTheme(institute);

  // Parse preferences safely
  let preferences = {};
  try {
    preferences = JSON.parse(user.preferences || "{}");
  } catch (error) {
    console.error("Failed to parse user preferences:", error);
  }

  // Format courses for the class-specific toggles
  const enrolledCourses = user.enrollments.map((e) => ({
    id: e.course.id,
    code: e.course.code,
    title: e.course.title,
  }));

  const taughtCourses = user.taughtCourses.map((c) => ({
    id: c.id,
    code: c.code,
    title: c.title,
  }));

  return (
    <SettingsClient
      instituteCode={institute}
      theme={theme}
      user={{
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
        preferences,
      }}
      enrolledCourses={enrolledCourses}
      taughtCourses={taughtCourses}
    />
  );
}
