"use client";

import { useState, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { X, Search, Hash, BookOpen, User, Users, Loader2, CheckCircle } from "lucide-react";
import { requestEnrollment, joinWithCode, getDiscoverableCourses } from "@/app/(dashboard)/[institute]/courses/actions";
import { toast } from "@/components/common/Toast";

interface DiscoverableCourse {
  id: string;
  title: string;
  code: string;
  subject: string;
  section: string;
  instructor: { name: string } | null;
  _count: { enrollments: number };
}

export default function JoinCourseModal({
  open,
  onClose,
  theme,
  instituteCode,
}: {
  open: boolean;
  onClose: () => void;
  theme: InstituteTheme;
  instituteCode: string;
}) {
  const [mode, setMode] = useState<"browse" | "code">("code");
  const [courseCode, setCourseCode] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState<DiscoverableCourse[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (open && mode === "browse") {
      setLoading(true);
      getDiscoverableCourses(instituteCode)
        .then((data) => setCourses(data))
        .finally(() => setLoading(false));
    }
  }, [open, mode, instituteCode]);

  useEffect(() => {
    if (!open) {
      setCourseCode("");
      setSearchQuery("");
      setRequestedIds(new Set());
    }
  }, [open]);

  const handleJoinWithCode = async () => {
    if (courseCode.length !== 6) {
      toast.error("Invalid code", "Course code must be exactly 6 characters.");
      return;
    }

    setSubmitting(true);

    const result = await joinWithCode(courseCode.toUpperCase(), instituteCode);

    if (result.success) {
      toast.success("Request submitted!", "Waiting for instructor approval.");
      setCourseCode("");
    } else {
      toast.error("Failed to join", result.error || "Failed to join course.");
    }

    setSubmitting(false);
  };

  const handleRequestEnrollment = async (courseId: string) => {
    const result = await requestEnrollment(courseId, instituteCode);

    if (result.success) {
      setRequestedIds((prev) => new Set([...prev, courseId]));
      toast.success("Request sent!", "Enrollment request submitted.");
    } else {
      toast.error("Request failed", result.error || "Failed to request enrollment.");
    }
  };

  const filteredCourses = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/10 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-[#F0F2F8]">Join a Course</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-700 dark:hover:text-[#F0F2F8] transition cursor-pointer"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02]">
          <button
            onClick={() => { setMode("code"); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition cursor-pointer ${
              mode === "code"
                ? "text-[#F97316] border-b-2 border-[#F97316] bg-white dark:bg-[#1A1D27]"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <Hash className="h-4 w-4" />
            Join with Code
          </button>
          <button
            onClick={() => { setMode("browse"); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold transition cursor-pointer ${
              mode === "browse"
                ? "text-[#F97316] border-b-2 border-[#F97316] bg-white dark:bg-[#1A1D27]"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <Search className="h-4 w-4" />
            Browse Courses
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {mode === "code" ? (
            /* ─── Code Mode ─── */
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Ask your instructor for the 6-character course code and enter it below.
              </p>

              <div className="flex gap-3">
                <input
                  value={courseCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                    setCourseCode(val);
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-4 py-3 text-center font-mono text-2xl tracking-[0.3em] font-bold text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-300 dark:placeholder:text-[#555C72] placeholder:tracking-[0.3em] focus:ring-2 focus:ring-orange-500/20 focus:border-[#F97316]"
                />
              </div>

              <div className="text-center text-xs text-slate-400 dark:text-[#555C72]">
                {courseCode.length}/6 characters
              </div>

              <Button
                theme={theme}
                onClick={handleJoinWithCode}
                disabled={courseCode.length !== 6 || submitting}
                className="w-full"
              >
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Request to Join
              </Button>
            </div>
          ) : (
            /* ─── Browse Mode ─── */
            <div className="space-y-4">
              <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3.5 py-2.5 shadow-xs">
                <Search className="h-4 w-4 text-slate-400 dark:text-[#8B92A5]" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses..."
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400 dark:placeholder:text-[#555C72]"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <p className="py-8 text-center text-xs text-slate-400 dark:text-[#555C72]">
                    {searchQuery
                      ? "No courses match your search."
                      : "No available courses found."}
                  </p>
                ) : (
                  filteredCourses.map((course) => {
                    const alreadyRequested = requestedIds.has(course.id);
                    return (
                      <div
                        key={course.id}
                        className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] p-3.5 hover:bg-slate-100/70 dark:hover:bg-white/[0.05] transition"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] truncate">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-[#8B92A5]">
                            <span className="font-mono">{course.code}</span>
                            {course.subject && (
                              <>
                                <span>•</span>
                                <span>{course.subject}</span>
                              </>
                            )}
                            {course.instructor && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {course.instructor.name}
                                </span>
                              </>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {course._count.enrollments}
                            </span>
                          </div>
                        </div>
                        {alreadyRequested ? (
                          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                            <CheckCircle className="h-3.5 w-3.5" />
                            Requested
                          </span>
                        ) : (
                          <Button
                            theme={theme}
                            variant="secondary"
                            onClick={() => handleRequestEnrollment(course.id)}
                          >
                            Request
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
