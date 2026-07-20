"use client";

import { useState, useEffect } from "react";
import type { InstituteTheme } from "@/lib/theme";
import Button from "@/components/common/Button";
import Badge from "@/components/common/Badge";
import { X, Search, Hash, BookOpen, User, Users, Loader2, CheckCircle } from "lucide-react";
import { requestEnrollment, joinWithCode, getDiscoverableCourses } from "@/app/(dashboard)/[institute]/courses/actions";

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
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
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
      setFeedback(null);
      setRequestedIds(new Set());
    }
  }, [open]);

  const handleJoinWithCode = async () => {
    if (courseCode.length !== 6) {
      setFeedback({ type: "error", message: "Course code must be exactly 6 characters." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);

    const result = await joinWithCode(courseCode.toUpperCase(), instituteCode);

    if (result.success) {
      setFeedback({ type: "success", message: "Enrollment request submitted! Waiting for instructor approval." });
      setCourseCode("");
    } else {
      setFeedback({ type: "error", message: result.error || "Failed to join course." });
    }

    setSubmitting(false);
  };

  const handleRequestEnrollment = async (courseId: string) => {
    setFeedback(null);
    const result = await requestEnrollment(courseId, instituteCode);

    if (result.success) {
      setRequestedIds((prev) => new Set([...prev, courseId]));
      setFeedback({ type: "success", message: "Enrollment request sent!" });
    } else {
      setFeedback({ type: "error", message: result.error || "Failed to request enrollment." });
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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-gray-300 bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-300 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Join a Course</h2>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-300">
          <button
            onClick={() => { setMode("code"); setFeedback(null); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition"
            style={{
              color: mode === "code" ? theme.colors.primary : "#6B7280",
              borderBottom: mode === "code" ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
            }}
          >
            <Hash className="h-4 w-4" />
            Join with Code
          </button>
          <button
            onClick={() => { setMode("browse"); setFeedback(null); }}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition"
            style={{
              color: mode === "browse" ? theme.colors.primary : "#6B7280",
              borderBottom: mode === "browse" ? `2px solid ${theme.colors.primary}` : "2px solid transparent",
            }}
          >
            <Search className="h-4 w-4" />
            Browse Courses
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5">
          {/* Feedback */}
          {feedback && (
            <div
              className={`mb-4 rounded-lg px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-red-50 text-red-700 border border-red-200"
              }`}
            >
              {feedback.message}
            </div>
          )}

          {mode === "code" ? (
            /* ─── Code Mode ─── */
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Ask your instructor for the 6-character course code and enter it below.
              </p>

              <div className="flex gap-3">
                <input
                  value={courseCode}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
                    setCourseCode(val);
                    setFeedback(null);
                  }}
                  placeholder="ABC123"
                  maxLength={6}
                  className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-3 text-center font-mono text-xl tracking-[0.3em] outline-none transition placeholder:text-gray-300 placeholder:tracking-[0.3em]"
                  style={{ borderColor: theme.colors.border }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.ring;
                    e.currentTarget.style.boxShadow = `0 0 0 2px ${theme.colors.ring}33`;
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = theme.colors.border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              <div className="text-center text-xs text-gray-400">
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
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
                <Search className="h-4 w-4 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search courses..."
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
                />
              </div>

              <div className="max-h-72 overflow-y-auto space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  </div>
                ) : filteredCourses.length === 0 ? (
                  <p className="py-8 text-center text-sm text-gray-400">
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
                        className="flex items-center justify-between rounded-lg border border-gray-300 px-4 py-3 hover:bg-gray-50 transition"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {course.title}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                            <span>{course.code}</span>
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
                          <span className="flex items-center gap-1 text-xs text-green-600">
                            <CheckCircle className="h-4 w-4" />
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
