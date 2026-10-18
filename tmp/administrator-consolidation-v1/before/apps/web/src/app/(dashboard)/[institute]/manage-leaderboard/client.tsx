"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Trophy,
  Sparkles,
  Plus,
  Trash2,
  Award,
  History,
  Send,
  Loader2,
  ToggleLeft,
  ToggleRight,
  BookOpen,
  Edit3,
  X,
  ExternalLink,
  Users,
  Search,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { toast } from "@/components/common/Toast";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";

interface CourseOption {
  id: string;
  title: string;
  code: string;
}

interface ActivityRewardTier {
  id?: string;
  placement: number;
  rewardLabel: string;
  bonusExp: number;
}

interface ActivityLeaderboardData {
  id: string;
  courseId: string;
  courseCode: string;
  courseTitle: string;
  title: string;
  type: string;
  maxPoints: number | null;
  leaderboardEnabled: boolean;
  participantCount: number;
  rewards: ActivityRewardTier[];
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
  rewardDescription: string;
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
  initialActivities: ActivityLeaderboardData[];
  initialRules: IncentiveRuleData[];
  students: StudentOption[];
  logs: TransactionLog[];
}

export default function ManageLeaderboardClient({
  theme,
  instituteCode,
  courses,
  initialActivities,
  initialRules,
  students,
  logs: initialLogs,
}: ManageLeaderboardClientProps) {
  // Navigation tab: "leaderboards" (primary), "rules" (grade thresholds), "commendations" (quick awards)
  const [activeTab, setActiveTab] = useState<"leaderboards" | "rules" | "commendations">("leaderboards");

  // Activities state
  const [activities, setActivities] = useState<ActivityLeaderboardData[]>(initialActivities);
  const [selectedCourseFilter, setSelectedCourseFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Leaderboard Modal State
  const [editingActivity, setEditingActivity] = useState<ActivityLeaderboardData | null>(null);
  const [editLeaderboardEnabled, setEditLeaderboardEnabled] = useState(false);
  const [editRewardTiers, setEditRewardTiers] = useState<ActivityRewardTier[]>([]);
  const [savingLeaderboard, setSavingLeaderboard] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Enable on New Activity Modal State
  const [showEnableModal, setShowEnableModal] = useState(false);
  const [enableCourseId, setEnableCourseId] = useState<string>(courses[0]?.id || "");
  const [enableActivityId, setEnableActivityId] = useState<string>("");
  const [newRewardTiers, setNewRewardTiers] = useState<ActivityRewardTier[]>([
    { placement: 1, rewardLabel: "", bonusExp: 50 },
    { placement: 3, rewardLabel: "", bonusExp: 25 },
  ]);
  const [enablingActivity, setEnablingActivity] = useState(false);

  // Existing Rules & Commendations State
  const [rules, setRules] = useState<IncentiveRuleData[]>(initialRules);
  const [logs, setLogs] = useState<TransactionLog[]>(initialLogs);
  const [showAddRule, setShowAddRule] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id || "");
  const [ruleLabel, setRuleLabel] = useState("");
  const [gradeMin, setGradeMin] = useState("90");
  const [bonusExp, setBonusExp] = useState("50");
  const [rewardDescription, setRewardDescription] = useState("");
  const [creatingRule, setCreatingRule] = useState(false);

  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || "");
  const [commendCourseId, setCommendCourseId] = useState(courses[0]?.id || "");
  const [commendAmount, setCommendAmount] = useState("30");
  const [commendReason, setCommendReason] = useState("");
  const [sendingCommendation, setSendingCommendation] = useState(false);

  // Filtered activities list
  const filteredActivities = useMemo(() => {
    return activities.filter((act) => {
      const matchCourse = selectedCourseFilter === "all" || act.courseId === selectedCourseFilter;
      const matchSearch =
        !searchQuery.trim() ||
        act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        act.courseTitle.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCourse && matchSearch;
    });
  }, [activities, selectedCourseFilter, searchQuery]);

  // Group activities by course
  const activitiesByCourse = useMemo(() => {
    const map = new Map<string, { course: CourseOption; items: ActivityLeaderboardData[] }>();
    for (const act of filteredActivities) {
      if (!map.has(act.courseId)) {
        map.set(act.courseId, {
          course: { id: act.courseId, code: act.courseCode, title: act.courseTitle },
          items: [],
        });
      }
      map.get(act.courseId)!.items.push(act);
    }
    return Array.from(map.values());
  }, [filteredActivities]);

  // Candidate activities for enabling (not enabled yet)
  const candidateActivities = useMemo(() => {
    return activities.filter(
      (a) => a.courseId === enableCourseId && !a.leaderboardEnabled
    );
  }, [activities, enableCourseId]);

  // ── Quick Toggle Leaderboard on Activity ──
  async function handleToggleLeaderboard(activity: ActivityLeaderboardData) {
    try {
      setTogglingId(activity.id);
      const nextVal = !activity.leaderboardEnabled;
      const res = await fetch("/api/leaderboard/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: activity.id,
          leaderboardEnabled: nextVal,
        }),
      });

      if (!res.ok) throw new Error("Failed to toggle leaderboard");

      setActivities((prev) =>
        prev.map((a) => (a.id === activity.id ? { ...a, leaderboardEnabled: nextVal } : a))
      );

      toast.success(
        nextVal ? "Leaderboard Enabled" : "Leaderboard Disabled",
        `Leaderboard for "${activity.title}" is now ${nextVal ? "active" : "disabled"}.`
      );
    } catch {
      toast.error("Error", "Failed to update activity leaderboard.");
    } finally {
      setTogglingId(null);
    }
  }

  // ── Open Edit Activity Modal ──
  function handleOpenEdit(activity: ActivityLeaderboardData) {
    setEditingActivity(activity);
    setEditLeaderboardEnabled(activity.leaderboardEnabled);
    setEditRewardTiers(activity.rewards || []);
  }

  // ── Save Edited Leaderboard Rewards ──
  async function handleSaveEditedLeaderboard() {
    if (!editingActivity) return;
    try {
      setSavingLeaderboard(true);
      const res = await fetch("/api/leaderboard/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: editingActivity.id,
          leaderboardEnabled: editLeaderboardEnabled,
          rewardTiers: editRewardTiers,
        }),
      });

      if (!res.ok) throw new Error("Failed to update rewards");
      const data = await res.json();

      setActivities((prev) =>
        prev.map((a) =>
          a.id === editingActivity.id
            ? {
                ...a,
                leaderboardEnabled: data.leaderboardEnabled,
                rewards: data.rewards,
              }
            : a
        )
      );

      toast.success(
        "Leaderboard Updated",
        `Saved settings and rewards for "${editingActivity.title}".`
      );
      setEditingActivity(null);
    } catch {
      toast.error("Error", "Failed to save leaderboard settings.");
    } finally {
      setSavingLeaderboard(false);
    }
  }

  // ── Enable Leaderboard on a chosen activity ──
  async function handleEnableNewLeaderboard(e: React.FormEvent) {
    e.preventDefault();
    if (!enableActivityId) {
      toast.warning("Validation", "Please select an activity to enable.");
      return;
    }

    try {
      setEnablingActivity(true);
      const res = await fetch("/api/leaderboard/manage", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          syllabusItemId: enableActivityId,
          leaderboardEnabled: true,
          rewardTiers: newRewardTiers,
        }),
      });

      if (!res.ok) throw new Error("Failed to enable leaderboard");
      const data = await res.json();

      setActivities((prev) =>
        prev.map((a) =>
          a.id === enableActivityId
            ? {
                ...a,
                leaderboardEnabled: true,
                rewards: data.rewards,
              }
            : a
        )
      );

      toast.success(
        "Leaderboard Enabled",
        "Activity leaderboard and reward tiers successfully created."
      );
      setShowEnableModal(false);
      setEnableActivityId("");
    } catch {
      toast.error("Error", "Failed to enable leaderboard.");
    } finally {
      setEnablingActivity(false);
    }
  }

  // ── Automated Grade Rules Handlers ──
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
          rewardDescription: rewardDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error("Failed to create rule");
      const newRule = (await res.json()) as IncentiveRuleData;

      setRules((prev) => [newRule, ...prev]);
      setRuleLabel("");
      setRewardDescription("");
      setShowAddRule(false);
      toast.success("Rule Created", `Automated reward "${newRule.label}" is active.`);
    } catch {
      toast.error("Error", "Failed to create grade reward rule.");
    } finally {
      setCreatingRule(false);
    }
  }

  async function handleToggleRule(ruleId: string, currentState: boolean) {
    try {
      const nextState = !currentState;
      const res = await fetch("/api/gamification/incentives", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ruleId, isActive: nextState }),
      });

      if (!res.ok) throw new Error("Failed to update rule");
      setRules((prev) => prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextState } : r)));
      toast.success(nextState ? "Rule Activated" : "Rule Deactivated", "Grade reward rule updated.");
    } catch {
      toast.error("Error", "Failed to toggle rule.");
    }
  }

  async function handleDeleteRule(ruleId: string) {
    if (!confirm("Are you sure you want to delete this reward rule?")) return;
    try {
      const res = await fetch(`/api/gamification/incentives?ruleId=${ruleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete rule");
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
      toast.success("Rule Deleted", "Reward rule removed.");
    } catch {
      toast.error("Error", "Failed to delete rule.");
    }
  }

  // ── Manual Commendation Handler ──
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

      const newLog: TransactionLog = {
        id: `local-${Date.now()}`,
        studentName: selectedStudent?.name || "Student",
        studentNumber: selectedStudent?.studentNumber || null,
        amount: parseInt(commendAmount, 10) || 30,
        reason: `Instructor Award: ${commendReason.trim()}`,
        createdAt: new Date().toISOString(),
      };
      setLogs((prev) => [newLog, ...prev]);

      setCommendReason("");
      toast.success(
        "Award Granted!",
        `Awarded +${commendAmount} EXP to ${selectedStudent?.name || "student"}.`
      );
    } catch {
      toast.error("Error", "Failed to grant award.");
    } finally {
      setSendingCommendation(false);
    }
  }

  const totalActiveLeaderboards = useMemo(() => {
    return activities.filter((a) => a.leaderboardEnabled).length;
  }, [activities]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-amber-500" />
            <span>Manage Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
            Configure activity leaderboards and reward tiers created across each of your classes.
          </p>
        </div>

        {activeTab === "leaderboards" && (
          <button
            type="button"
            onClick={() => {
              if (courses.length > 0) {
                setEnableCourseId(courses[0].id);
                const firstCandidate = activities.find(
                  (a) => a.courseId === courses[0].id && !a.leaderboardEnabled
                );
                setEnableActivityId(firstCandidate?.id || "");
              }
              setShowEnableModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Leaderboard</span>
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 w-full sm:w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("leaderboards")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "leaderboards"
              ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
              : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-500" />
            Class Leaderboards
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 font-mono">
              {totalActiveLeaderboards}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "rules"
              ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
              : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-blue-500" />
            Grade Rules
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-mono">
              {rules.length}
            </span>
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("commendations")}
          className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === "commendations"
              ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
              : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Send className="w-3.5 h-3.5 text-emerald-500" />
            Quick Award
          </span>
        </button>
      </div>

      {/* ── TAB 1: CLASS LEADERBOARDS (PRIMARY) ── */}
      {activeTab === "leaderboards" && (
        <div className="space-y-6">
          {/* Controls: Course Filter & Search */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] shrink-0">Class:</span>
              <select
                value={selectedCourseFilter}
                onChange={(e) => setSelectedCourseFilter(e.target.value)}
                className="w-full sm:w-64 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
              >
                <option value="all">All Classes ({courses.length})</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.code} - {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search activities or classes..."
                className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-xs text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 outline-none focus:border-[#F97316] transition-colors"
              />
            </div>
          </div>

          {/* Grouped by Course / Class */}
          {activitiesByCourse.length === 0 ? (
            <div className="p-12 text-center rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721]">
              <Trophy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                {activities.length === 0
                  ? "No activities created in your classes yet. Add classwork items to set up leaderboards."
                  : "No leaderboards match your filter."}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {activitiesByCourse.map(({ course, items }) => (
                <div
                  key={course.id}
                  className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-4"
                >
                  {/* Course Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/5 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="px-2.5 py-1 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 font-black text-xs font-mono">
                        {course.code}
                      </span>
                      <h3 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8]">
                        {course.title}
                      </h3>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {items.filter((i) => i.leaderboardEnabled).length} Active Leaderboards
                    </span>
                  </div>

                  {/* Activities List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {items.map((activity) => (
                      <div
                        key={activity.id}
                        className={`p-4 rounded-2xl border transition-all space-y-3 ${
                          activity.leaderboardEnabled
                            ? "bg-slate-50/70 dark:bg-white/[0.03] border-slate-200/80 dark:border-white/10"
                            : "bg-slate-100/40 dark:bg-white/[0.01] border-slate-200/40 dark:border-white/5 opacity-70"
                        }`}
                      >
                        {/* Top: Type, Title, Toggle */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                {activity.type.replace("_", " ")}
                              </span>
                              {activity.maxPoints && (
                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                                  {activity.maxPoints} pts
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                                <Users className="w-3 h-3" />
                                {activity.participantCount} ranked
                              </span>
                            </div>
                            <h4 className="text-xs font-black text-slate-900 dark:text-[#F0F2F8] truncate">
                              {activity.title}
                            </h4>
                          </div>

                          {/* Quick Toggle Switch */}
                          <button
                            type="button"
                            onClick={() => handleToggleLeaderboard(activity)}
                            disabled={togglingId === activity.id}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer shrink-0"
                            title={activity.leaderboardEnabled ? "Disable Leaderboard" : "Enable Leaderboard"}
                          >
                            {activity.leaderboardEnabled ? (
                              <ToggleRight className="w-6 h-6 text-emerald-500" />
                            ) : (
                              <ToggleLeft className="w-6 h-6 text-slate-400" />
                            )}
                          </button>
                        </div>

                        {/* Middle: Reward Tiers configured */}
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#555C72] mb-1.5">
                            Reward Tiers
                          </p>
                          {activity.rewards && activity.rewards.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {activity.rewards.map((r, idx) => (
                                <span
                                  key={idx}
                                  className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold border border-amber-500/20 flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                  <span>Top {r.placement}:</span>
                                  <span>
                                    {r.rewardLabel
                                      ? r.bonusExp > 0
                                        ? `${r.rewardLabel} (+${r.bonusExp} EXP)`
                                        : r.rewardLabel
                                      : `+${r.bonusExp} EXP`}
                                  </span>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[11px] text-slate-400 italic">
                              No custom rewards configured.
                            </p>
                          )}
                        </div>

                        {/* Bottom Actions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-white/5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(activity)}
                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] hover:text-[#F97316] dark:hover:text-[#F97316] transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit Rewards</span>
                          </button>

                          <Link
                            href={`/${instituteCode}/leaderboards`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:underline"
                          >
                            <span>View Leaderboard</span>
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AUTOMATED GRADE RULES ── */}
      {activeTab === "rules" && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#F97316]" />
                  Grade Rewards
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Reward students who hit a grade target in your courses.
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

            {showAddRule && (
              <form
                onSubmit={handleCreateRule}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 space-y-4 animate-in fade-in duration-150"
              >
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-[#F0F2F8]">
                  Create New Grade Threshold
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

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                      Custom Reward (optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Certificate of Excellence, +5 on final grade"
                      value={rewardDescription}
                      onChange={(e) => setRewardDescription(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Leave blank to award EXP only, or type any reward alongside the EXP bonus.
                    </p>
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
                  No automated reward rules configured yet.
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
                        <span>
                          Threshold:{" "}
                          <strong className="text-slate-700 dark:text-[#F0F2F8]">
                            ≥ {rule.gradeMin}%
                          </strong>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                          +{rule.bonusExp} Bonus EXP
                        </span>
                        {rule.rewardDescription && (
                          <>
                            <span>•</span>
                            <span className="text-purple-600 dark:text-purple-400 font-semibold">
                              {rule.rewardDescription}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
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
        </div>
      )}

      {/* ── TAB 3: QUICK AWARD & AUDIT LOG ── */}
      {activeTab === "commendations" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-5">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                  <Send className="w-4 h-4 text-emerald-500" />
                  Quick Award
                </h2>
                <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  Recognize active participation or outstanding project effort.
                </p>
              </div>

              <form onSubmit={handleSendCommendation} className="space-y-4">
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

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                    Commendation Reason
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="e.g. Outstanding code demonstration during lab session"
                    value={commendReason}
                    onChange={(e) => setCommendReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none resize-none placeholder:text-slate-400"
                  />
                </div>

                <Button
                  theme={theme}
                  type="submit"
                  loading={sendingCommendation}
                  disabled={students.length === 0}
                  className="w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Award</span>
                </Button>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-500" />
                  Recent Distributions
                </h2>
                <span className="text-[11px] text-slate-400 font-mono">Last 20 Grants</span>
              </div>

              {logs.length === 0 ? (
                <p className="text-xs text-slate-400 dark:text-slate-500 text-center py-6">
                  No recent distributions recorded.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5 max-h-96 overflow-y-auto">
                  {logs.map((log) => (
                    <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-900 dark:text-[#F0F2F8]">
                            {log.studentName}
                          </span>
                          {log.studentNumber && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              ({log.studentNumber})
                            </span>
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
                          {new Date(log.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ACTIVITY LEADERBOARD MODAL ── */}
      {editingActivity && (
        <Modal
          open={!!editingActivity}
          title={`Leaderboard: ${editingActivity.title}`}
          onClose={() => setEditingActivity(null)}
        >
          <div className="space-y-4 px-1 py-1">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-white/5">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">
                  {editingActivity.courseCode} • {editingActivity.type.replace("_", " ")}
                </span>
                <h4 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8]">
                  {editingActivity.title}
                </h4>
              </div>
              {editingActivity.maxPoints && (
                <span className="text-xs font-mono font-bold text-emerald-600">
                  {editingActivity.maxPoints} pts
                </span>
              )}
            </div>

            {/* Toggle Active Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none rounded-xl p-3 bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10">
              <input
                type="checkbox"
                checked={editLeaderboardEnabled}
                onChange={(e) => setEditLeaderboardEnabled(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 dark:border-white/20 text-amber-500 focus:ring-amber-500"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800 dark:text-[#F0F2F8]">
                  Enable Leaderboard for this Activity
                </span>
                <p className="text-slate-500 dark:text-[#8B92A5] mt-0.5">
                  When enabled, student scores will appear on the Course leaderboard tab with the rewards configured below.
                </p>
              </div>
            </label>

            {/* Reward Tiers Builder (Identical to Classwork Feature) */}
            {editLeaderboardEnabled && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#8B92A5]">
                    Reward Tiers (Customized for participants)
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setEditRewardTiers([
                        ...editRewardTiers,
                        {
                          placement:
                            editRewardTiers.length === 0
                              ? 1
                              : editRewardTiers[editRewardTiers.length - 1].placement + 2,
                          rewardLabel: "",
                          bonusExp: 0,
                        },
                      ])
                    }
                    className="text-xs text-amber-600 hover:text-amber-500 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Tier</span>
                  </button>
                </div>

                {editRewardTiers.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2">
                    No reward tiers configured. Click &quot;Add Tier&quot; to award top participants.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {editRewardTiers.map((tier, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        {/* Number of participants input */}
                        <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1">
                          <span className="text-[11px] font-bold text-slate-500 dark:text-[#8B92A5]">
                            Top
                          </span>
                          <input
                            type="number"
                            min="1"
                            max="200"
                            value={tier.placement}
                            onChange={(e) => {
                              const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                              const updated = [...editRewardTiers];
                              updated[idx] = { ...updated[idx], placement: val };
                              setEditRewardTiers(updated);
                            }}
                            className="w-10 text-center text-xs font-mono font-bold text-slate-900 dark:text-[#F0F2F8] bg-transparent outline-none"
                            title="Number of top participants who receive this reward"
                          />
                        </div>

                        {/* Custom Reward Text Input */}
                        <input
                          type="text"
                          value={tier.rewardLabel}
                          onChange={(e) => {
                            const updated = [...editRewardTiers];
                            updated[idx] = { ...updated[idx], rewardLabel: e.target.value };
                            setEditRewardTiers(updated);
                          }}
                          placeholder="e.g. +5 bonus points on final grade"
                          className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
                        />

                        {/* Bonus EXP Input */}
                        <input
                          type="number"
                          value={tier.bonusExp || ""}
                          onChange={(e) => {
                            const updated = [...editRewardTiers];
                            updated[idx] = {
                              ...updated[idx],
                              bonusExp: parseInt(e.target.value, 10) || 0,
                            };
                            setEditRewardTiers(updated);
                          }}
                          placeholder="EXP"
                          className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-amber-600 font-mono outline-none placeholder:text-slate-400"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            setEditRewardTiers(editRewardTiers.filter((_, i) => i !== idx))
                          }
                          className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button
                theme={theme}
                variant="secondary"
                onClick={() => setEditingActivity(null)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                theme={theme}
                onClick={handleSaveEditedLeaderboard}
                loading={savingLeaderboard}
                className="text-xs"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── CREATE LEADERBOARD MODAL (ON CANDIDATE ACTIVITY) ── */}
      {showEnableModal && (
        <Modal
          open={showEnableModal}
          title="Create Activity Leaderboard"
          onClose={() => setShowEnableModal(false)}
        >
          <form onSubmit={handleEnableNewLeaderboard} className="space-y-4 px-1 py-1">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 dark:text-[#8B92A5] mb-1">
                Select Class
              </label>
              <select
                value={enableCourseId}
                onChange={(e) => {
                  setEnableCourseId(e.target.value);
                  const first = activities.find(
                    (a) => a.courseId === e.target.value && !a.leaderboardEnabled
                  );
                  setEnableActivityId(first?.id || "");
                }}
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
                Select Activity
              </label>
              {candidateActivities.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">
                  All activities in this class already have leaderboards enabled, or no classwork items exist yet.
                </p>
              ) : (
                <select
                  value={enableActivityId}
                  onChange={(e) => setEnableActivityId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
                >
                  <option value="">-- Choose an Activity --</option>
                  {candidateActivities.map((act) => (
                    <option key={act.id} value={act.id}>
                      [{act.type.replace("_", " ")}] {act.title}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Reward Tiers Builder */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-[#8B92A5]">
                  Reward Tiers (Customized for participants)
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setNewRewardTiers([
                      ...newRewardTiers,
                      {
                        placement:
                          newRewardTiers.length === 0
                            ? 1
                            : newRewardTiers[newRewardTiers.length - 1].placement + 2,
                        rewardLabel: "",
                        bonusExp: 0,
                      },
                    ])
                  }
                  className="text-xs text-amber-600 hover:text-amber-500 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Tier</span>
                </button>
              </div>

              <div className="space-y-2">
                {newRewardTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1">
                      <span className="text-[11px] font-bold text-slate-500 dark:text-[#8B92A5]">
                        Top
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={tier.placement}
                        onChange={(e) => {
                          const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                          const updated = [...newRewardTiers];
                          updated[idx] = { ...updated[idx], placement: val };
                          setNewRewardTiers(updated);
                        }}
                        className="w-10 text-center text-xs font-mono font-bold text-slate-900 dark:text-[#F0F2F8] bg-transparent outline-none"
                      />
                    </div>

                    <input
                      type="text"
                      value={tier.rewardLabel}
                      onChange={(e) => {
                        const updated = [...newRewardTiers];
                        updated[idx] = { ...updated[idx], rewardLabel: e.target.value };
                        setNewRewardTiers(updated);
                      }}
                      placeholder="e.g. +5 bonus points on final grade"
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-slate-900 dark:text-[#F0F2F8] outline-none placeholder:text-slate-400"
                    />

                    <input
                      type="number"
                      value={tier.bonusExp || ""}
                      onChange={(e) => {
                        const updated = [...newRewardTiers];
                        updated[idx] = {
                          ...updated[idx],
                          bonusExp: parseInt(e.target.value, 10) || 0,
                        };
                        setNewRewardTiers(updated);
                      }}
                      placeholder="EXP"
                      className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-[#1A1D27] text-xs text-amber-600 font-mono outline-none placeholder:text-slate-400"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setNewRewardTiers(newRewardTiers.filter((_, i) => i !== idx))
                      }
                      className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-white/5">
              <Button
                theme={theme}
                variant="secondary"
                onClick={() => setShowEnableModal(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                theme={theme}
                type="submit"
                loading={enablingActivity}
                disabled={!enableActivityId}
                className="text-xs"
              >
                Enable Leaderboard
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
