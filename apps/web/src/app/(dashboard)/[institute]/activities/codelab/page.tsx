/**
 * CodeLab Track Browser Page
 * Route: /[institute]/activities/codelab
 *
 * ICS-Exclusive Coding Activity Hub.
 * Shows all 8 independent language tracks (Python, C++, C#, Java, JavaScript, SQL, HTML, CSS)
 * with individual progress tracking (Levels 1–30), real SVG logos, and interactive dot constellations.
 */

import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/auth-session";
import { isEligibleForActivities, isEligibleInstituteCode } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import CodeLabHeroHeader from "@/features/interactive-activities/codelab/components/CodeLabHeroHeader";
import TrackCardGrid, {
  type TrackConfig,
  type TrackProgressData,
} from "@/features/interactive-activities/codelab/components/TrackCardGrid";

const TRACKS: readonly TrackConfig[] = [
  {
    language: "python",
    name: "Python",
    description: "Beginner-friendly language for scripting, data science, and web APIs.",
    dotColor: "#3776AB",
    borderClass: "border-l-yellow-400 dark:border-l-yellow-400",
    badgeClass: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20",
  },
  {
    language: "cpp",
    name: "C++",
    description: "High-performance systems programming, memory control, and STL algorithms.",
    dotColor: "#00599C",
    borderClass: "border-l-blue-500 dark:border-l-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  {
    language: "csharp",
    name: "C#",
    description: "Modern OOP with .NET, LINQ, strong typing, and enterprise development.",
    dotColor: "#9B4F96",
    borderClass: "border-l-purple-500 dark:border-l-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  {
    language: "java",
    name: "Java",
    description: "Robust, object-oriented language running anywhere on the JVM.",
    dotColor: "#EA580C",
    borderClass: "border-l-orange-500 dark:border-l-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  {
    language: "javascript",
    name: "JavaScript",
    description: "The language of the web, full-stack Node.js, and interactive UIs.",
    dotColor: "#F7DF1E",
    borderClass: "border-l-yellow-300 dark:border-l-yellow-300",
    badgeClass: "bg-yellow-400/10 text-yellow-600 dark:text-yellow-300 border-yellow-400/20",
  },
  {
    language: "sql",
    name: "SQL",
    description: "Query, filter, join, and analyze relational databases with SQLite.",
    dotColor: "#0EA5E9",
    borderClass: "border-l-sky-400 dark:border-l-sky-400",
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  {
    language: "html",
    name: "HTML",
    description: "Structure web pages with semantic tags and live in-browser preview.",
    dotColor: "#E44D26",
    borderClass: "border-l-rose-500 dark:border-l-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  {
    language: "css",
    name: "CSS",
    description: "Design modern responsive layouts, colors, flexbox, and grid systems.",
    dotColor: "#1572B6",
    borderClass: "border-l-cyan-500 dark:border-l-cyan-400",
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
] as const;

export default async function CodeLabTrackBrowserPage({
  params,
}: {
  params: Promise<{ institute: string }>;
}) {
  const { institute } = await params;
  const session = await getSession();

  if (!session) {
    redirect(`/login?institute=${institute}`);
  }

  // 1. Enforce ICS-only feature guard
  const eligible = await isEligibleForActivities({
    user: {
      id: session.user.id,
      role: session.user.role,
      instituteId: session.user.instituteId,
    },
  });

  if (!eligible || !isEligibleInstituteCode(institute)) {
    notFound();
  }

  // 2. Fetch student's CodeLab submissions
  const submissions = await db.activitySubmission.findMany({
    where: {
      studentId: session.user.id,
      activityType: "codelab",
    },
    select: {
      score: true,
      passed: true,
      stateCheck: true,
      templateId: true,
    },
  });

  // 3. Compute highest passed level per track
  const trackScores: Record<string, Record<number, number>> = {
    python: {},
    cpp: {},
    csharp: {},
    java: {},
    javascript: {},
    sql: {},
    html: {},
    css: {},
  };

  for (const sub of submissions) {
    if (!sub.stateCheck) continue;
    try {
      const state = JSON.parse(sub.stateCheck) as Record<string, unknown>;
      let lang = state.language as string | undefined;
      let level = Number(state.level);

      if (!lang && sub.templateId) {
        const match = sub.templateId.match(/^([a-z0-9]+)-level-(\d+)$/i);
        if (match) {
          lang = match[1].toLowerCase();
          level = parseInt(match[2], 10);
        }
      }

      if (lang && trackScores[lang] !== undefined && !isNaN(level) && level >= 1 && level <= 30) {
        const existing = trackScores[lang][level] ?? 0;
        trackScores[lang][level] = Math.max(existing, sub.score);
      }
    } catch {
      // ignore
    }
  }

  const trackProgress: Record<string, TrackProgressData> = {};
  for (const [lang, scores] of Object.entries(trackScores)) {
    const passedLevels = Object.entries(scores).filter(([, score]) => score >= 60);
    const passedCount = passedLevels.length;
    const highestPassed = passedLevels
      .map(([lvl]) => parseInt(lvl, 10))
      .reduce((max, lvl) => Math.max(max, lvl), 0);
    trackProgress[lang] = { highestPassed, passedCount };
  }

  return (
    <div className="space-y-8 pb-12 page-enter max-w-7xl mx-auto">
      {/* ─── 1. Clean Header Banner with Floating Icons Background ─── */}
      <CodeLabHeroHeader institute={institute} />

      {/* ─── 2. 8 Track Cards Grid with Dot Constellation Hover ─── */}
      <TrackCardGrid
        tracks={TRACKS}
        trackProgress={trackProgress}
        institute={institute}
      />
    </div>
  );
}
