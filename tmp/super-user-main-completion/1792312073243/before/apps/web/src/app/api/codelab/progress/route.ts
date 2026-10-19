/**
 * GET /api/codelab/progress
 *
 * Computes a student's CodeLab progression per language track.
 * Reads `ActivitySubmission.stateCheck` to determine scores and highest passed levels (score >= 60).
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";
import { checkActivityEligibility } from "@/lib/activity-eligibility";
import { db } from "@/lib/db";
import { ProblemLanguage } from "@/features/interactive-activities/codelab/problems/types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const eligibility = await checkActivityEligibility();
    if (!eligibility || !eligibility.eligible) {
      return NextResponse.json({ error: "Forbidden: Not eligible for activities" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetLanguage = searchParams.get("language") as ProblemLanguage | null;

    // Fetch student's CodeLab submissions
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

        // Fallback: deduce from templateId pattern "{lang}-level-{N}"
        if (!lang && sub.templateId) {
          const match = sub.templateId.match(/^([a-z0-9]+)-level-(\d+)$/i);
          if (match) {
            lang = match[1].toLowerCase();
            level = parseInt(match[2], 10);
          }
        }

        if (lang && trackScores[lang] !== undefined && !isNaN(level) && level >= 1 && level <= 30) {
          const existingScore = trackScores[lang][level] ?? 0;
          trackScores[lang][level] = Math.max(existingScore, sub.score);
        }
      } catch {
        // Skip unparseable stateCheck
      }
    }

    // Helper to calculate highest passed level
    function getHighestPassed(scores: Record<number, number>): number {
      return Object.entries(scores)
        .filter(([, score]) => score >= 60)
        .map(([lvl]) => parseInt(lvl, 10))
        .reduce((max, lvl) => Math.max(max, lvl), 0);
    }

    if (targetLanguage && trackScores[targetLanguage]) {
      const scores = trackScores[targetLanguage];
      const highestPassedLevel = getHighestPassed(scores);
      return NextResponse.json({
        language: targetLanguage,
        highestPassedLevel,
        scores,
      });
    }

    // Return summary for all tracks
    const allProgress: Record<string, { highestPassedLevel: number; scores: Record<number, number> }> = {};
    for (const [lang, scores] of Object.entries(trackScores)) {
      allProgress[lang] = {
        highestPassedLevel: getHighestPassed(scores),
        scores,
      };
    }

    return NextResponse.json(allProgress);
  } catch (err: unknown) {
    console.error("CODELAB_PROGRESS_ERROR", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
