"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  HelpCircle,
  FileCheck2,
  Calendar,
  Sparkles,
  Loader2,
  Plus,
} from "lucide-react";
import MobileBlocker from "@/components/forms/builder/MobileBlocker";
import type { FormType } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface NewFormClientProps {
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
}

export default function NewFormClient({
  courseId,
  instituteCode,
  theme,
}: NewFormClientProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [formType, setFormType] = useState<FormType>("QUIZ");
  const [timeLimitMins, setTimeLimitMins] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const primaryColor = theme.colors.primary;

  const FORM_TYPES = [
    {
      type: "QUIZ",
      label: "Quiz",
      description: "Short assessments tied to a lesson or topic.",
      icon: HelpCircle,
    },
    {
      type: "MIDTERM_EXAM",
      label: "Midterm Exam",
      description: "Major exam with timing and proctoring controls.",
      icon: Calendar,
    },
    {
      type: "FINAL_EXAM",
      label: "Final Exam",
      description: "Comprehensive end-of-term assessment.",
      icon: FileCheck2,
    },
    {
      type: "ACTIVITY",
      label: "Activity",
      description: "Interactive tasks with file uploads and open answers.",
      icon: BookOpen,
    },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a title for this form.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/courses/${courseId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          formType,
          timeLimitMins: timeLimitMins !== "" ? Number(timeLimitMins) : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create form.");
      }

      router.push(
        `/${instituteCode}/courses/${courseId}/classwork/forms/${data.formId}/builder`
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to create form.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-[#0B0E17] py-8 px-4 sm:px-6">
      {/* Mobile creation blocker */}
      <MobileBlocker theme={theme} />

      <div className="max-w-2xl mx-auto space-y-6">
        <Link
          href={`/${instituteCode}/courses/${courseId}/classwork`}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Classwork</span>
        </Link>

        <div className="rounded-3xl bg-white dark:bg-[#12151E] border border-slate-200/90 dark:border-white/10 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create New Assessment Form
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8B92A5]">
              Build Google Forms-style quizzes, major exams, or interactive activities.
            </p>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Form Type Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Assessment Type:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FORM_TYPES.map((t) => {
                  const isSelected = formType === t.type;
                  const Icon = t.icon;

                  return (
                    <div
                      key={t.type}
                      onClick={() => setFormType(t.type as FormType)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/10 ring-1 ring-primary shadow-xs"
                          : "border-slate-200 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <div
                          className={`p-1.5 rounded-xl ${
                            isSelected ? "text-primary" : "text-slate-400"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          {t.label}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                        {t.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Title:
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit 3 Quiz: Data Structures & Algorithms"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Description & Instructions (optional):
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide instructions, topics covered, or expectations for students..."
                className="w-full p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Time limit */}
            <div className="space-y-1 max-w-xs">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Time Limit (optional):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={300}
                  value={timeLimitMins}
                  onChange={(e) =>
                    setTimeLimitMins(e.target.value ? Number(e.target.value) : "")
                  }
                  placeholder="No limit"
                  className="w-32 px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-900 dark:text-white focus:outline-hidden"
                />
                <span className="text-xs text-slate-500">minutes</span>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4 flex items-center justify-end">
              <button
                type="submit"
                disabled={isSubmitting || !title.trim()}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 disabled:opacity-50 transition-opacity"
                style={{ backgroundColor: primaryColor }}
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                <span>{isSubmitting ? "Creating Form..." : "Open Form Builder"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
