"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Trophy,
  Flame,
  Search,
  Eye,
  EyeOff,
  Sparkles,
  BookOpen,
  Zap,
} from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import UserAvatar from "@/components/common/UserAvatar";
import LevelBadge from "@/components/common/LevelBadge";
import CountUpNumber from "@/features/interactive-activities/codelab/components/analytics/CountUpNumber";
import LeaderboardPodium, { type PodiumStudent } from "@/features/gamification/components/LeaderboardPodium";
import { toast } from "@/components/common/Toast";
import StudentProfileModal from "@/components/common/StudentProfileModal";

interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
}

interface LeaderboardActivity {
  id: string;
  title: string;
  type: string;
  maxPoints: number | null;
  courseId: string;
  course: { code: string; title: string };
  leaderboardRewards: { placement: number; rewardLabel: string; bonusExp: number }[];
}

interface LeaderboardsClientProps {
  rankings: PodiumStudent[];
  enrolledCourses: EnrolledCourse[];
  leaderboardActivities: LeaderboardActivity[];
  currentUserId: string;
  instituteCode: string;
  theme: InstituteTheme;
  initialSelfAnonymized: boolean;
  initialCourseId?: string;
  initialActivityId?: string;
}

type TabType = "global" | "course";

export default function LeaderboardsClient({
  rankings,
  enrolledCourses,
  leaderboardActivities,
  currentUserId,
  instituteCode,
  theme,
  initialSelfAnonymized,
  initialCourseId,
  initialActivityId,
}: LeaderboardsClientProps) {
  const isIte = instituteCode?.toLowerCase() === "ite";
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>(initialCourseId || leaderboardActivities.length ? "course" : "global");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    initialCourseId || leaderboardActivities[0]?.courseId || enrolledCourses[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnonymized, setIsAnonymized] = useState(initialSelfAnonymized);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(initialActivityId ?? null);
  const [activityRankings, setActivityRankings] = useState<{rank:number;studentId:string;name:string;avatarUrl:string|null;department:string;score:number|null;maxPoints:number|null;exp:number;level:number;levelTier:string;streak:number;badgeCount:number;isSelf:boolean;isAnonymized:boolean}[]>([]);
  const [activityMeta, setActivityMeta] = useState<{ title: string; maxPoints: number | null; course: { code: string; title: string } } | null>(null);
  const [activityRewards, setActivityRewards] = useState<{ placement: number; rewardLabel: string; bonusExp: number }[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(Boolean(initialActivityId));
  const [activityError, setActivityError] = useState<string | null>(null);
  const [profileModal, setProfileModal] = useState<{open:boolean;studentId:string;name:string;avatarUrl:string|null;department:string;exp:number;level:number;levelTier:string;streak:number;badgeCount:number;isSelf:boolean;isAnonymized:boolean}|null>(null);

  const filteredActivities = useMemo(() => {
    return leaderboardActivities.filter(a => a.courseId === selectedCourseId);
  }, [leaderboardActivities, selectedCourseId]);

  const displayedActivityRankings = activityRankings.filter(student => student.name.toLowerCase().includes(searchQuery.trim().toLowerCase()));

  useEffect(() => {
    const controller = new AbortController();
    setActivityRankings([]);
    setActivityMeta(null);
    setActivityRewards([]);
    setActivityError(null);
    setLoadingActivity(Boolean(selectedActivityId));
    if (!selectedActivityId) return;
    async function load() {
      try {
        const res = await fetch(`/api/leaderboard/activity?syllabusItemId=${encodeURIComponent(selectedActivityId!)}`, { signal: controller.signal, cache: "no-store" });
        const data = await res.json();
        if (controller.signal.aborted) return;
        if (!res.ok) throw new Error(data.message || "Could not load this leaderboard.");
        setActivityRankings(data.rankings);
        setActivityMeta(data.item);
        setActivityRewards(data.rewards || []);
      } catch (error) {
        if (!controller.signal.aborted) setActivityError(error instanceof Error ? error.message : "Could not load this leaderboard.");
      } finally {
        if (!controller.signal.aborted) setLoadingActivity(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [selectedActivityId]);

  function openProfile(student: { studentId: string; name: string; avatarUrl: string | null; department: string; exp: number; level: number; levelTier: string; streak: number; badgeCount: number; isSelf: boolean; isAnonymized: boolean }) {
    if (student.isAnonymized && !student.isSelf) return;
    setProfileModal({ open: true, ...student });
  }

  async function handleTogglePrivacy() {
    try {
      setTogglingPrivacy(true);
      const nextVal = !isAnonymized;
      const res = await fetch("/api/gamification/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAnonymized: nextVal }),
      });
      if (res.ok) {
        setIsAnonymized(nextVal);
        router.refresh();
        toast.success(
          nextVal ? "Private Mode Enabled" : "Public Profile Enabled",
          nextVal
            ? "Your name is now hidden and shown as Student #ID to peers."
            : "Your name and avatar are now visible on the leaderboard."
        );
      }
    } catch {
      toast.error("Error", "Failed to update leaderboard privacy.");
    } finally {
      setTogglingPrivacy(false);
    }
  }

  // Filter rankings based on search
  const displayedRankings = useMemo(() => {
    return rankings.filter((item) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        item.name.toLowerCase().includes(query) ||
        item.department.toLowerCase().includes(query)
      );
    });
  }, [rankings, searchQuery]);

  const top3 = useMemo(() => {
    return displayedRankings.slice(0, 3);
  }, [displayedRankings]);

  const restRankings = useMemo(() => {
    return displayedRankings.slice(3);
  }, [displayedRankings]);

  const selfRecord = useMemo(() => {
    return rankings.find((r) => r.isSelf);
  }, [rankings]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8] flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <span>Leaderboard</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
            See who's leading across the institute and your courses.
          </p>
        </div>

        {/* Anonymity / Privacy Toggle Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePrivacy}
            disabled={togglingPrivacy}
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-2xl border text-xs font-bold transition-all cursor-pointer shadow-xs ${
              isAnonymized
                ? "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-[#F0F2F8]"
                : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
            }`}
            title="Toggle whether your real name appears to classmates on leaderboards"
          >
            {isAnonymized ? (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Leaderboard: Private</span>
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 text-emerald-500" />
                <span>Leaderboard: Public</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => { setActiveTab("global"); setSelectedActivityId(null); }}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "global"
                ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              EXP
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("course")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "course"
                ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-500" />
              Course
            </span>
          </button>
        </div>

        {/* Course Select (if course tab) */}
        {activeTab === "course" && enrolledCourses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => { setSelectedCourseId(e.target.value); setSelectedActivityId(null); setSearchQuery(""); }}
            aria-label="Class"
            className="w-full sm:w-56 px-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-xs font-bold text-slate-900 dark:text-[#F0F2F8] outline-none"
          >
            {enrolledCourses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.title}
              </option>
            ))}
          </select>
        )}

        {/* Search */}
        {(activeTab === "global" || selectedActivityId) && <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search students..."
            className={`w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-xs text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 outline-none transition-colors ${
              isIte ? "focus:border-blue-600" : "focus:border-[#F97316]"
            }`}
          />
        </div>}
      </div>

      {/* Your Rank Floating Snapshot Card (if logged in user has rank) */}
      {activeTab === "global" && selfRecord && (
        <div className={`p-4 rounded-3xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isIte
            ? "border-blue-500/30 bg-blue-500/5 dark:bg-blue-950/20"
            : "border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`flex items-center justify-center w-10 h-10 rounded-2xl text-white font-black text-sm ${
              isIte ? "bg-blue-600" : "bg-[#F97316]"
            }`}>
              #{selfRecord.rank}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-slate-900 dark:text-[#F0F2F8]">
                  Your Ranking
                </span>
                <LevelBadge exp={selfRecord.exp} size="sm" />
              </div>
              <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                {selfRecord.streak}-day streak • {selfRecord.badgeCount} badges earned
              </p>
            </div>
          </div>

          <div className="text-right">
            <span className="text-xs text-slate-500 dark:text-[#8B92A5] block">Total Points</span>
            <span className={`text-base font-black font-mono ${
              isIte ? "text-blue-600 dark:text-blue-400" : "text-[#F97316]"
            }`}>
              <CountUpNumber value={selfRecord.exp} /> EXP
            </span>
          </div>
        </div>
      )}


      {/* Global Tab Content */}
      {activeTab === "global" && (
        <>
          {/* Top 3 Podium */}
          {top3.length > 0 && (
            <LeaderboardPodium top3={top3} theme={theme} onSelectStudent={openProfile} />
          )}

          {/* Ranks 4–50 Table */}
          <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
                Rankings (Top 50)
              </h2>
              <span className="text-xs text-slate-400 dark:text-[#555C72] font-mono">
                {displayedRankings.length} Students Listed
              </span>
            </div>

            {displayedRankings.length === 0 ? (
              <div className="p-12 text-center">
                <Trophy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
                  No students found matching your search.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/5">
                {restRankings.map((student) => {
                  return (
                    <div
                      key={student.studentId}
                      onClick={() => openProfile(student)}
                      className={`flex items-center justify-between px-6 py-3.5 transition-colors cursor-pointer ${
                        student.isSelf
                          ? isIte
                            ? "bg-blue-500/5 dark:bg-blue-500/10 font-bold"
                            : "bg-orange-500/5 dark:bg-orange-500/10 font-bold"
                          : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                      }`}
                    >
                      {/* Left: Rank + Avatar + Name + Level Badge */}
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 text-center text-xs font-black font-mono text-slate-400 dark:text-[#555C72]">
                          #{student.rank}
                        </span>

                        <UserAvatar
                          name={student.name}
                          avatarUrl={student.avatarUrl}
                          size="sm"
                          color={theme.colors.primary}
                        />

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">
                              {student.name}
                            </span>
                            {student.isSelf && (
                              <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                isIte
                                  ? "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                                  : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                              }`}>
                                You
                              </span>
                            )}
                            <LevelBadge exp={student.exp} size="sm" />
                          </div>
                          <span className="text-[10px] text-slate-400 dark:text-[#555C72]">
                            {student.department}
                          </span>
                        </div>
                      </div>

                      {/* Right: Streak + Badges + EXP */}
                      <div className="flex items-center gap-4 text-right">
                        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500 dark:text-[#8B92A5]">
                          <span className="flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                            {student.streak}d
                          </span>
                          <span className="flex items-center gap-1">
                            <Trophy className="w-3.5 h-3.5 text-amber-500" />
                            {student.badgeCount}
                          </span>
                        </div>

                        <div className={`text-xs font-black font-mono min-w-[70px] ${
                          isIte ? "text-blue-600 dark:text-blue-400" : "text-[#F97316]"
                        }`}>
                          <CountUpNumber value={student.exp} duration={800} /> EXP
                        </div>
                      </div>
                    </div>

                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Course Tab Content */}
      {activeTab === "course" && (
        <div className="space-y-6">
          {!selectedActivityId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredActivities.length === 0 ? (
                <div className="col-span-2 text-center p-12 text-slate-500 dark:text-[#8B92A5] border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
                  No leaderboard activities available for this course yet.
                </div>
              ) : (
                filteredActivities.map(activity => (
                  <button
                    key={activity.id}
                    onClick={() => { setLoadingActivity(true); setSelectedActivityId(activity.id); }}
                    className={`text-left p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#141721] transition-colors shadow-xs ${
                      isIte ? "hover:border-blue-600/50" : "hover:border-[#F97316]/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-[#555C72] tracking-wider">
                        {activity.type.replace('_', ' ')}
                      </span>
                      {activity.maxPoints && (
                        <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                          {activity.maxPoints} pts
                        </span>
                      )}
                    </div>
                    <h3 className="font-bold text-slate-900 dark:text-[#F0F2F8] text-sm mb-2">
                      {activity.title}
                    </h3>
                    {activity.leaderboardRewards && activity.leaderboardRewards.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {activity.leaderboardRewards.map((r, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 font-semibold border border-amber-500/20">
                            Top {r.placement}: {r.rewardLabel ? (r.bonusExp > 0 ? `${r.rewardLabel} (+${r.bonusExp} EXP)` : r.rewardLabel) : `+${r.bonusExp} EXP`}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className={`flex items-center gap-1.5 text-xs font-bold ${
                      isIte ? "text-blue-600 dark:text-blue-400" : "text-orange-500"
                    }`}>
                      <Trophy className="w-3.5 h-3.5" />
                      View Rankings
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => {
                  setSelectedActivityId(null);
                  setActivityRankings([]);
                  setActivityMeta(null);
                  setActivityRewards([]);
                  setSearchQuery("");
                }}
                className="text-xs font-bold text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8] flex items-center gap-1.5 cursor-pointer"
              >
                ← Back to Activities
              </button>
              
              {loadingActivity ? (
                <div className="p-12 text-center text-xs text-slate-500">Loading rankings...</div>
              ) : activityError ? (
                <p role="alert" className="p-6 text-sm text-red-600">{activityError}</p>
              ) : (
                <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 dark:text-[#F0F2F8]">
                        {activityMeta?.title}
                      </h2>
                      <p className="text-[10px] text-slate-500 dark:text-[#8B92A5]">
                        {activityMeta?.course.code} • {activityRankings.length} ranked students {activityMeta?.maxPoints != null ? `• Out of ${activityMeta.maxPoints} points` : ''}
                      </p>
                    </div>
                    {activityRewards.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {activityRewards.map(r => (
                          <div key={r.placement} className="text-[10px] px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1.5 border border-amber-500/20">
                            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                            <span>Top {r.placement}:</span>
                            <span>{r.rewardLabel ? (r.bonusExp > 0 ? `${r.rewardLabel} (+${r.bonusExp} EXP)` : r.rewardLabel) : `+${r.bonusExp} EXP`}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-white/5">
                    {activityRankings.length === 0 ? (
                      <div className="p-12 text-center text-xs text-slate-500">No released scores yet. Scores appear here after the instructor grades and returns the work or releases the quiz results.</div>
                    ) : (
                      displayedActivityRankings.length === 0 ? (
                        <p className="p-6 text-center text-xs text-slate-500">No students match your search.</p>
                      ) : displayedActivityRankings.map(student => (
                        <div
                          key={student.studentId}
                          onClick={() => openProfile(student)}
                          className={`flex items-center justify-between px-6 py-3.5 transition-colors cursor-pointer ${
                            student.isSelf
                              ? isIte
                                ? "bg-blue-500/5 dark:bg-blue-500/10 font-bold"
                                : "bg-orange-500/5 dark:bg-orange-500/10 font-bold"
                              : "hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="w-6 text-center text-xs font-black font-mono text-slate-400 dark:text-[#555C72]">
                              #{student.rank}
                            </span>
                            <UserAvatar name={student.name} avatarUrl={student.avatarUrl} size="sm" color={theme.colors.primary} />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 dark:text-[#F0F2F8] truncate">{student.name}</span>
                                {student.isSelf && (
                                  <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                                    isIte ? "bg-blue-500/15 text-blue-600 dark:text-blue-400" : "bg-orange-500/15 text-orange-600"
                                  }`}>
                                    You
                                  </span>
                                )}

                                {(() => {
                                  const matchingReward = activityRewards
                                    .filter(r => student.rank <= r.placement)
                                    .sort((a, b) => a.placement - b.placement)[0];
                                  if (!matchingReward) return null;
                                  return (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                      🏆 {matchingReward.rewardLabel || `+${matchingReward.bonusExp} EXP`}
                                    </span>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            {student.score !== null && (
                              <div className="text-xs font-bold text-slate-600 dark:text-[#8B92A5]">
                                {student.score} {activityMeta?.maxPoints != null ? `/ ${activityMeta.maxPoints}` : 'pts'}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {profileModal && (
        <StudentProfileModal
          open={profileModal.open}
          onClose={() => setProfileModal(null)}
          studentId={profileModal.studentId}
          name={profileModal.name}
          avatarUrl={profileModal.avatarUrl}
          department={profileModal.department}
          exp={profileModal.exp}
          level={profileModal.level}
          levelTier={profileModal.levelTier}
          streak={profileModal.streak}
          badgeCount={profileModal.badgeCount}
          isSelf={profileModal.isSelf}
          isAnonymized={profileModal.isAnonymized}
          primaryColor={theme.colors.primary}
        />
      )}
    </div>
  );
}
