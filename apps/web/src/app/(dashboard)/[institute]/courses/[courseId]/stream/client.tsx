"use client";

import { useActionState, useEffect, useRef } from "react";
import type { InstituteTheme } from "@/lib/theme";
import AnnouncementCard from "@/components/courses/AnnouncementCard";
import Button from "@/components/common/Button";
import { Send, MessageSquare } from "lucide-react";
import { createAnnouncement } from "./actions";

interface Announcement {
  id: string;
  content: string;
  createdAt: string;
  author: { name: string };
}

const initialState = { message: "" };

export default function StreamClient({
  announcements,
  courseId,
  instituteCode,
  theme,
  canPost,
}: {
  announcements: Announcement[];
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  canPost: boolean;
}) {
  const [state, formAction] = useActionState(createAnnouncement, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.message === "success") {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Post form */}
      {canPost && (
        <form ref={formRef} action={formAction} className="space-y-3">
          <input type="hidden" name="courseId" value={courseId} />
          <input type="hidden" name="instituteCode" value={instituteCode} />

          <div className="rounded-lg border border-gray-300 bg-white p-4">
            <textarea
              name="content"
              required
              rows={3}
              placeholder="Announce something to your class..."
              className="w-full resize-none bg-transparent text-sm outline-none placeholder:text-gray-400"
            />
            <div className="mt-3 flex justify-end">
              <Button theme={theme} type="submit">
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </div>

          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600">{state.message}</p>
          )}
        </form>
      )}

      {/* Announcements feed */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="rounded-full bg-gray-100 p-5 mb-4">
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-700">
            No announcements yet
          </h3>
          <p className="mt-1 text-sm text-gray-400">
            {canPost
              ? "Share updates, reminders, or resources with your class."
              : "Your instructor hasn't posted any announcements yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <AnnouncementCard key={a.id} announcement={a} theme={theme} />
          ))}
        </div>
      )}
    </div>
  );
}
