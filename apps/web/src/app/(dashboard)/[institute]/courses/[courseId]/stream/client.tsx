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
  author: { id: string; name: string; avatarUrl: string | null };
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

          <div className="rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-5 shadow-xs transition-colors">
            <textarea
              name="content"
              required
              rows={3}
              placeholder="Announce something to your class..."
              className="w-full resize-none bg-transparent text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
            />
            <div className="mt-3 flex justify-end">
              <Button theme={theme} type="submit">
                <Send className="mr-2 h-4 w-4" />
                Post
              </Button>
            </div>
          </div>

          {state.message && state.message !== "success" && (
            <p className="text-sm text-red-600 dark:text-red-400">{state.message}</p>
          )}
        </form>
      )}

      {/* Announcements feed */}
      {announcements.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-8 shadow-xs">
          <div className="rounded-full bg-slate-100 dark:bg-white/5 p-5 mb-4">
            <MessageSquare className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-[#F0F2F8]">
            No announcements yet
          </h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-[#8B92A5] max-w-sm">
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
