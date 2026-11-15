import type { Metadata } from "next";
import LectureVideosClient from "@/components/lecture-videos/LectureVideosClient";
import { requireLectureVideosPageActor } from "@/lib/lecture-videos/guard";
import {
  lectureUploadsConfigured,
  listActorIteCourses,
  listIteLectureVideos,
} from "@/lib/lecture-videos/service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lecture Videos | ITE Portal",
  description:
    "Subject-based recorded lecture videos and student viewing progress for the Institute of Teacher Education.",
};

interface LectureVideosPageProps {
  params: Promise<{ institute: string }>;
}

export default async function LectureVideosPage({
  params,
}: LectureVideosPageProps) {
  const { institute } = await params;
  const actor = await requireLectureVideosPageActor(institute);
  const [initialLectures, courses] = await Promise.all([
    listIteLectureVideos(actor),
    listActorIteCourses(actor),
  ]);

  return (
    <LectureVideosClient
      initialLectures={initialLectures}
      courses={courses}
      userId={actor.userId}
      userRole={actor.role}
      uploadsConfigured={lectureUploadsConfigured()}
    />
  );
}
