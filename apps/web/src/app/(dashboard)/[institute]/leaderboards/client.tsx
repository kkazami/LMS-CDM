"use client";

import { useState, useMemo } from "react";
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

interface EnrolledCourse {
  id: string;
  title: string;
  code: string;
}

interface LeaderboardsClientProps {
  rankings: PodiumStudent[];
  enrolledCourses: EnrolledCourse[];
  currentUserId: string;
  instituteCode: string;
  theme: InstituteTheme;
  initialSelfAnonymized: boolean;
}

type TabType = "global" | "course" | "weekly";

export default function LeaderboardsClient({
  rankings,
  enrolledCourses,
  currentUserId,
  theme,
  initialSelfAnonymized,
}: LeaderboardsClientProps) {
  const [activeTab, setActiveTab] = useState<TabType>("global");
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    enrolledCourses[0]?.id || ""
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnonymized, setIsAnonymized] = useState(initialSelfAnonymized);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);

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
        toast.success(
          nextVal ? "Anonymity Enabled" : "Public Profile Enabled",
          nextVal
            ? "Your name is now shown as Scholar #ID to peers."
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
            <span>Hall of Fame & Leaderboards</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
            Celebrate top scholars, track EXP progression, and climb the ranks.
          </p>
        </div>

        {/* Anonymity Toggle Button */}
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
                <span>Leaderboard: Anonymous</span>
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
            onClick={() => setActiveTab("global")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "global"
                ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5 text-amber-500" />
              Global Institute
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
              Course Cohort
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("weekly")}
            className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "weekly"
                ? "bg-white dark:bg-[#1E2235] text-slate-900 dark:text-[#F0F2F8] shadow-xs"
                : "text-slate-500 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#F97316]" />
              Weekly Sprint
            </span>
          </button>
        </div>

        {/* Course Select (if course tab) */}
        {activeTab === "course" && enrolledCourses.length > 0 && (
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
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
        <div className="relative w-full sm:w-60">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search scholars..."
            className="w-full pl-9 pr-3 py-2 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#141721] text-xs text-slate-900 dark:text-[#F0F2F8] placeholder:text-slate-400 outline-none focus:border-[#F97316] transition-colors"
          />
        </div>
      </div>

      {/* Your Rank Floating Snapshot Card (if logged in user has rank) */}
      {selfRecord && (
        <div className="p-4 rounded-3xl border border-orange-500/30 bg-orange-500/5 dark:bg-orange-950/20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#F97316] text-white font-black text-sm">
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
            <span className="text-base font-black font-mono text-[#F97316]">
              <CountUpNumber value={selfRecord.exp} /> EXP
            </span>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <LeaderboardPodium top3={top3} theme={theme} />
      )}

      {/* Ranks 4–50 Table */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#8B92A5]">
            Rankings (Top 50)
          </h2>
          <span className="text-xs text-slate-400 dark:text-[#555C72] font-mono">
            {displayedRankings.length} Scholars Listed
          </span>
        </div>

        {displayedRankings.length === 0 ? (
          <div className="p-12 text-center">
            <Trophy className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
              No scholars found matching your search.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {restRankings.map((student) => {
              return (
                <div
                  key={student.studentId}
                  className={`flex items-center justify-between px-6 py-3.5 transition-colors ${
                    student.isSelf
                      ? "bg-orange-500/5 dark:bg-orange-500/10 font-bold"
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
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-orange-500/15 text-orange-600 dark:text-orange-400 font-bold">
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

                    <div className="text-xs font-black font-mono text-[#F97316] min-w-[70px]">
                      <CountUpNumber value={student.exp} duration={800} /> EXP
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
