"use client";

import { useState } from "react";
import { localDateTimeValue } from "@/lib/forms/availability";
import {
  X,
  Clock,
  Calendar,
  Shield,
  Eye,
  Shuffle,
  Lock,
  Trophy,
  Save,
  CheckCircle,
} from "lucide-react";
import type { FormData, ScoreToKeep } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface FormSettingsPanelProps {
  form: FormData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updates: Partial<FormData> & { password?: string }) => Promise<void>;
  theme?: InstituteTheme;
}

export default function FormSettingsPanel({
  form,
  isOpen,
  onClose,
  onSave,
  theme,
}: FormSettingsPanelProps) {
  const [opensAt, setOpensAt] = useState(
    localDateTimeValue(form.opensAt)
  );
  const [closesAt, setClosesAt] = useState(
    localDateTimeValue(form.closesAt)
  );
  const [timeLimitMins, setTimeLimitMins] = useState<number | "">(
    form.timeLimitMins ?? ""
  );
  const [maxAttempts, setMaxAttempts] = useState(form.maxAttempts || 1);
  const [scoreToKeep, setScoreToKeep] = useState<ScoreToKeep>(form.scoreToKeep || "HIGHEST");
  const [shuffleQuestions, setShuffleQuestions] = useState(form.shuffleQuestions);
  const [shuffleOptions, setShuffleOptions] = useState(form.shuffleOptions);
  const [showScoreAfter, setShowScoreAfter] = useState(form.showScoreAfter);
  const [showAnswersAfter, setShowAnswersAfter] = useState(form.showAnswersAfter);
  const [showFeedbackAfter, setShowFeedbackAfter] = useState(form.showFeedbackAfter);
  const [isProctored, setIsProctored] = useState(form.isProctored);
  const [password, setPassword] = useState("");
  const [disableCopyPaste, setDisableCopyPaste] = useState(form.disableCopyPaste);
  const [detectTabSwitch, setDetectTabSwitch] = useState(form.detectTabSwitch);
  const [lockBrowser, setLockBrowser] = useState(form.lockBrowser);
  const [passingScore, setPassingScore] = useState<number | "">(form.passingScore ?? "");
  const [confirmationMessage, setConfirmationMessage] = useState(form.confirmationMessage || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const primaryColor = theme?.colors?.primary || "#3B82F6";

  const handleSave = async () => {
    setError("");
    if (opensAt && closesAt && new Date(closesAt) <= new Date(opensAt)) { setError("Close date and time must be after open date and time."); return; }
    setIsSaving(true);
    try {
      await onSave({
        opensAt: opensAt ? new Date(opensAt) : null,
        closesAt: closesAt ? new Date(closesAt) : null,
        timeLimitMins: timeLimitMins !== "" ? Number(timeLimitMins) : null,
        maxAttempts: Number(maxAttempts) || 1,
        scoreToKeep,
        shuffleQuestions,
        shuffleOptions,
        showScoreAfter,
        showAnswersAfter,
        showFeedbackAfter,
        isProctored,
        disableCopyPaste,
        detectTabSwitch,
        lockBrowser,
        passingScore: passingScore !== "" ? Number(passingScore) : null,
        confirmationMessage,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save settings. Try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#12151E] rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200/80 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Form Settings & Access Control
              </h3>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                Configure availability, time limits, security, and score display
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Section 1: Availability & Timing */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Availability & Deadlines</span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-300">Times use your device’s local timezone. Students can see this form only after its opening time.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Opens at (Start date & time):
                </label>
                <input
                  type="datetime-local"
                  aria-label="Opens at"
                  value={opensAt}
                  onChange={(e) => setOpensAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Closes at (Deadline):
                </label>
                <input
                  type="datetime-local"
                  aria-label="Closes at"
                  value={closesAt}
                  onChange={(e) => setClosesAt(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Timer & Attempts */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span>Timer & Attempt Limits</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Time limit (minutes):
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  placeholder="Unlimited"
                  value={timeLimitMins}
                  onChange={(e) => setTimeLimitMins(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Max attempts allowed:
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1">
                  Score to keep in gradebook:
                </label>
                <select
                  value={scoreToKeep}
                  onChange={(e) => setScoreToKeep(e.target.value as ScoreToKeep)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-white"
                >
                  <option value="HIGHEST">Highest score</option>
                  <option value="LATEST">Latest score</option>
                  <option value="AVERAGE">Average score</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Shuffling & Results Visibility */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5] flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span>Ordering & Student Feedback</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleQuestions}
                  onChange={(e) => setShuffleQuestions(e.target.checked)}
                  className="rounded border-slate-300 text-primary"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Shuffle question order</div>
                  <div className="text-[11px] text-slate-500">Randomize question sequence per attempt</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={shuffleOptions}
                  onChange={(e) => setShuffleOptions(e.target.checked)}
                  className="rounded border-slate-300 text-primary"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Shuffle answer options</div>
                  <div className="text-[11px] text-slate-500">Randomize choice options per question</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showScoreAfter}
                  onChange={(e) => setShowScoreAfter(e.target.checked)}
                  className="rounded border-slate-300 text-primary"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Show score after submission</div>
                  <div className="text-[11px] text-slate-500">Display grade instantly upon submit</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswersAfter}
                  onChange={(e) => setShowAnswersAfter(e.target.checked)}
                  className="rounded border-slate-300 text-primary"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Show correct answers</div>
                  <div className="text-[11px] text-slate-500">Reveal correct answers in result view</div>
                </div>
              </label>
            </div>
          </div>

          {/* Section 4: Exam Security & Anti-Cheat */}
          <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-2">
              <Shield className="w-4 h-4 text-rose-500" />
              <span>Exam Integrity & Proctoring</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isProctored}
                  onChange={(e) => setIsProctored(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Proctored Exam Mode</div>
                  <div className="text-[11px] text-slate-500">Activates strict anti-cheating audit trail</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={detectTabSwitch}
                  onChange={(e) => setDetectTabSwitch(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Detect Tab Switches</div>
                  <div className="text-[11px] text-slate-500">Log blur and window focus changes</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disableCopyPaste}
                  onChange={(e) => setDisableCopyPaste(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Disable Copy & Paste</div>
                  <div className="text-[11px] text-slate-500">Block clipboard actions in exam</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lockBrowser}
                  onChange={(e) => setLockBrowser(e.target.checked)}
                  className="rounded border-rose-400 text-rose-600"
                />
                <div>
                  <div className="font-semibold text-slate-800 dark:text-white">Require Fullscreen Mode</div>
                  <div className="text-[11px] text-slate-500">Log warnings if student exits fullscreen</div>
                </div>
              </label>
            </div>

            {/* Password protection */}
            <div className="pt-2">
              <label className="block text-slate-600 dark:text-slate-300 font-medium mb-1 text-xs">
                Access Code / Password (optional):
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder={form.hasPassword ? "•••••••• (Leave blank to keep existing password)" : "Set password for proctored test room"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Section 5: Custom Confirmation */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
              Confirmation Message
            </h4>
            <textarea
              rows={2}
              value={confirmationMessage}
              onChange={(e) => setConfirmationMessage(e.target.value)}
              placeholder="Your response has been submitted successfully."
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs text-slate-800 dark:text-white"
            />
          </div>
        </div>

        {error && <p role="alert" className="px-6 pb-4 text-sm text-red-700 dark:text-red-300">{error}</p>}
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition-opacity"
            style={{ backgroundColor: primaryColor }}
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
