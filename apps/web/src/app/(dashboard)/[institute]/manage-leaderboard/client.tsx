"use client";

import { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  Award,
  History,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { toast } from "@/components/common/Toast";
import Button from "@/components/common/Button";

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface IncentiveRuleData {
  id: string;
  courseId: string;
  courseTitle: string;
  courseCode: string;
  label: string;
  gradeMin: number;
  bonusExp: number;
  isActive: boolean;
  createdAt: string;
}

interface StudentOption {
  id: string;
  name: string;
  email: string;
  studentNumber: string | null;
  courseId: string;
  courseCode: string;
}

interface TransactionLog {
  id: string;
  studentName: string;
  studentNumber: string | null;
  amount: number;
  reason: string;
  createdAt: string;
}

interface ManageLeaderboardClientProps {
  theme: InstituteTheme;
  instituteCode: string;
  courses: CourseOption[];
  initialRules: IncentiveRuleData[];
  students: StudentOption[];
  logs: TransactionLog[];
}

export default function ManageLeaderboardClient({
  theme,
  courses,
  initialRules,
  students,
  logs: initialLogs,
}: ManageLeaderboardClientProps) {
  const [rules, setRules] = useState<IncentiveRuleData[]>(initialRules);
  const [logs, setLogs] = useState<TransactionLog[]>(initialLogs);

  // New Rule Form State
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [ruleLabel, setRuleLabel] = useState("");
  const [gradeMin, setGradeMin] = useState("90");
  const [bonusExp, setBonusExp] = useState("50");
  const [creatingRule, setCreatingRule] = useState(false);

  // Direct Commendation Form State
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [commendCourseId, setCommendCourseId] = useState(courses[0]?.id || "");
  const [commendAmount, setCommendAmount] = useState("30");
  const [commendReason, setCommendReason] = useState("");
  const [sendingCommendation, setSendingCommendation] = useState(false);

  // ── Create Automated Rule ──
  async function handleCreateRule(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCourseId || !ruleLabel.trim()) {
      toast.warning("Validation", "Please enter a rule label and select a course.");
      return;
    }

    try {
      setCreatingRule(true);
      const res = await fetch("/api/gamification/incentives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseId: selectedCourseId,
          label: ruleLabel.trim(),
          gradeMin: parseFloat(gradeMin) || 90,
          bonusExp: parseInt(bonusExp, 10) || 50,
        }),
      });

      if (!res.ok) throw new Error("Failed to create rule");
      const newRule = (await res.json()) as IncentiveRuleData;

      setRules((prev) => [newRule, ...prev]);
      setRuleLabel("");
      setShowAddRule(false);
      toast.success(
        "Rule Created",
        `Automated incentive "${newRule.label}" is now active.`
      );
    } catch {
      toast.error("Error", "Failed to create grade incentive rule.");
    } finally {
      setCreatingRule(false);
    }
  }

  // ── Toggle Rule Active State ──
  async function handleToggleRule(ruleId: string, currentState: boolean) {
    try {
      const nextState = !currentState;
      const res = await fetch("/api/gamification/incentives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isActive: nextState }),
      });

      if (!res.ok) throw new Error("Failed to update rule");
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextState } : r))
      );
      toast.success(
        nextState ? "Rule Activated" : "Rule Deactivated",
        "Student grade awards updated."
      );
    } catch {
      toast.error("Error", "Failed to toggle rule.");
    }
  }

  // ── Delete Rule ──
  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this incentive rule?")) return;

    try {
      const res = await fetch(`/api/gamification/incentives?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Rule Deleted", "Incentive rule removed.");
    } catch {
      toast.error("Error", "Failed to delete rule.");
    }
  }

  // ── Issue Direct Commendation ──
  async function handleSendCommendation(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudentId || !commendReason.trim()) {
      toast.warning("Validation", "Please select a student and provide a reason.");
      return;
    }

    try {
      setSendingCommendation(true);
      const res = await fetch("/api/gamification/commend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          courseId: commendCourseId || undefined,
          amount: parseInt(commendAmount, 10) || 30,
          reason: commendReason.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to commend");
      const selectedStudent = students.find((s) => s.id === selectedStudentId);

      // Add to local audit log preview
      const newLog: TransactionLog = {
        id: `local-${Date.now()}`,
        studentName: selectedStudent?.name || "Student",
        studentNumber: selectedStudent?.studentNumber || null,
        amount: parseInt(commendAmount, 10) || 30,
        reason: `Instructor Commendation: ${commendReason.trim()}`,
        createdAt: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);

      setCommendReason("");
      toast.success(
        "Commendation Awarded!",
        `Awarded +${commendAmount} EXP to ${selectedStudent?.name || "student"}.`
      );
    } catch {
      toast.error("Error", "Failed to issue commendation.");
    } finally {
      setSendingCommendation(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-16">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2.5">
          <Sparkles className="w-6 h-6 text-[#F97316]" />
          <span>Instructor Incentive & Gamification Portal</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
          Define automated grade-to-EXP thresholds, grant direct student commendations, and view distribution audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Column 1 & 2: Automated Rules + Audit Log ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Automated Incentive Rules */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#F97316]" />
                  Automated Grade Incentive Rules
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Automatically award bonus EXP whenever a student achieves a target grade.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowAddRule(!showAddRule)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddRule ? "Cancel" : "Add Rule"}</span>
              </button>
            </div>

            {/* Inline Add Rule Form */}
            {showAddRule && (
              <form
                onSubmit={handleCreateRule}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4 animate-in fade-in duration-150"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#F0F2F8]">
                  Create New Incentive Threshold
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                      Course
                    </label>
                    <select
                      value={selectedCourseId}
                      onChange={(e) => setSelectedCourseId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
                    >
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.code} - {c.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                      Incentive Label
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. High Honor Score, Perfect Assignment"
                      value={ruleLabel}
                      onChange={(e) => setRuleLabel(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                      Min Grade Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      required
                      value={gradeMin}
                      onChange={(e) => setGradeMin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                      Bonus EXP Awarded
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="500"
                      required
                      value={bonusExp}
                      onChange={(e) => setBonusExp(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-[#F97316] outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    theme={theme}
                    type="submit"
                    loading={creatingRule}
                    className="text-xs py-2 px-4"
                  >
                    Save Rule
                  </Button>
                </div>
              </form>
            )}

            {/* Rules List */}
            {rules.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-white/5 border border-dashed border-slate-200 dark:border-white/10">
                <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                  No automated incentive rules configured yet. Click "Add Rule" to incentivize your students.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                      rule.isActive
                        ? "bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/5"
                        : "bg-slate-100/40 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/5 opacity-60"
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded-md bg-[#F97316]/10 text-[#F97316] font-bold text-xs">
                          {rule.courseCode}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">
                          {rule.label}
                        </h4>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-[#8B92A5]">
                        <span>Threshold: <strong className="text-slate-700 dark:text-[#F0F2F8]">≥ {rule.gradeMin}%</strong></span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          +{rule.bonusExp} Bonus EXP
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                      {/* Active Toggle */}
                      <button
                        type="button"
                        onClick={() => handleToggleRule(rule.id, rule.isActive)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title={rule.isActive ? "Deactivate Rule" : "Activate Rule"}
                      >
                        {rule.isActive ? (
                          <ToggleRight className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <ToggleLeft className="w-6 h-6 text-slate-400" />
                        )}
                      </button>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
                        aria-label="Delete rule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Distribution Log */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                <History className="w-4 h-4 text-purple-500" />
                Recent Incentive Distributions
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">Last 20 Grants</span>
            </div>

            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                No recent incentive distributions recorded.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-72 overflow-y-auto">
                {logs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-900 dark:text-[#F0F2F8]">{log.studentName}</span>
                        {log.studentNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">({log.studentNumber})</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-[#8B92A5] line-clamp-1">
                        {log.reason}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 block">
                        +{log.amount} EXP
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Column 3: Direct Student Commendation Form ── */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-5">
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                <Send className="w-4 h-4 text-emerald-500" />
                Issue Manual Commendation
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                Recognize active class participation, peer mentoring, or outstanding project effort.
              </p>
            </div>

            <form onSubmit={handleSendCommendation} className="space-y-4">
              {/* Select Student */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                  Recipient Student
                </label>
                {students.length === 0 ? (
                  <p className="text-xs text-slate-400">No students enrolled in your courses.</p>
                ) : (
                  <select
                    value={selectedStudentId}
                    onChange={(e) => setSelectedStudentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
                  >
                    {students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.studentNumber || s.courseCode})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Select Course */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                  Course Context (Optional)
                </label>
                <select
                  value={commendCourseId}
                  onChange={(e) => setCommendCourseId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
                >
                  <option value="">-- General / No Specific Course --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Commendation Amount */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                  EXP Amount (5–250 EXP)
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {["15", "30", "50", "100"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setCommendAmount(val)}
                      className={`py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                        commendAmount === val
                          ? "bg-[#F97316] text-white shadow-xs"
                          : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-[#8B92A5]"
                      }`}
                    >
                      +{val}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min="5"
                  max="250"
                  required
                  value={commendAmount}
                  onChange={(e) => setCommendAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-[#F97316] outline-none"
                />
              </div>

              {/* Commendation Reason */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                  Commendation Note / Reason
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Outstanding live code demonstration during lab session"
                  value={commendReason}
                  onChange={(e) => setCommendReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none resize-none placeholder:text-slate-400"
                />
              </div>

              {/* Submit Button */}
              <Button
                theme={theme}
                type="submit"
                loading={sendingCommendation}
                disabled={students.length === 0}
                className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Award EXP Commendation</span>
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
