import { db } from "@/lib/db";

export async function refreshLeaderboardCache(courseId: string) {
  // Aggregate points per student for a specific course
  // We join submissions, templates, and profiles.
  
  // For the MVP without complex views, we can query submissions for the course
  const submissions = await db.activitySubmission.findMany({
    where: {
      template: { courseId }
    },
    include: {
      student: {
        include: {
          gamificationProfile: true
        }
      }
    }
  });

  // Calculate points (e.g. 1 point per percent score, max 100 per submission)
  // And take the max score per template per student
  const bestScores = new Map<string, Map<string, number>>(); // studentId -> templateId -> score

  for (const sub of submissions) {
    if (!bestScores.has(sub.studentId)) {
      bestScores.set(sub.studentId, new Map());
    }
    const studentScores = bestScores.get(sub.studentId)!;
    const currentBest = studentScores.get(sub.templateId) || 0;
    studentScores.set(sub.templateId, Math.max(currentBest, sub.score));
  }

  const rankings: Array<{ studentId: string; displayName: string; points: number }> = [];

  for (const [studentId, templateScores] of Array.from(bestScores.entries())) {
    let totalPoints = 0;
    for (const score of Array.from(templateScores.values())) {
      totalPoints += score;
    }

    // Find the student name and privacy setting
    const sampleSub = submissions.find(s => s.studentId === studentId);
    if (sampleSub) {
      const profile = sampleSub.student.gamificationProfile;
      const isAnonymized = profile ? profile.isLeaderboardAnonymized : true;
      const displayName = isAnonymized ? "Anonymous Student" : sampleSub.student.name;

      rankings.push({
        studentId,
        displayName,
        points: totalPoints
      });
    }
  }

  // Sort descending by points
  rankings.sort((a, b) => b.points - a.points);

  // Update Cache
  await db.activityLeaderboardCache.upsert({
    where: {
      courseId_activityType: {
        courseId,
        activityType: "overall"
      }
    },
    update: {
      rankings: JSON.stringify(rankings)
    },
    create: {
      courseId,
      activityType: "overall",
      rankings: JSON.stringify(rankings)
    }
  });
}

export async function refreshCodeLabLeaderboardCache(courseId?: string | null) {
  // Aggregate rankings for CodeLab specifically
  const whereClause: { activityType: string; template?: { courseId: string } } = {
    activityType: "codelab",
  };
  if (courseId) {
    whereClause.template = { courseId };
  }

  const submissions = await db.activitySubmission.findMany({
    where: whereClause,
    include: {
      student: {
        include: {
          gamificationProfile: true,
        },
      },
    },
  });

  const bestScores = new Map<string, Map<string, number>>();

  for (const sub of submissions) {
    if (!bestScores.has(sub.studentId)) {
      bestScores.set(sub.studentId, new Map());
    }
    const studentScores = bestScores.get(sub.studentId)!;
    const currentBest = studentScores.get(sub.templateId) || 0;
    studentScores.set(sub.templateId, Math.max(currentBest, sub.score));
  }

  const rankings: Array<{
    studentId: string;
    displayName: string;
    points: number;
    problemsSolved: number;
  }> = [];

  for (const [studentId, templateScores] of Array.from(bestScores.entries())) {
    let totalPoints = 0;
    let problemsSolved = 0;
    for (const score of Array.from(templateScores.values())) {
      totalPoints += score;
      if (score === 100) problemsSolved++;
    }

    const sampleSub = submissions.find((s) => s.studentId === studentId);
    if (sampleSub) {
      const profile = sampleSub.student.gamificationProfile;
      const isAnonymized = profile ? profile.isLeaderboardAnonymized : true;
      const displayName = isAnonymized ? "Anonymous Student" : sampleSub.student.name;

      rankings.push({
        studentId,
        displayName,
        points: totalPoints,
        problemsSolved,
      });
    }
  }

  rankings.sort((a, b) => b.points - a.points || b.problemsSolved - a.problemsSolved);

  const targetCourseId = courseId || null;
  const existing = await db.activityLeaderboardCache.findFirst({
    where: {
      courseId: targetCourseId,
      activityType: "codelab",
    },
  });

  if (existing) {
    await db.activityLeaderboardCache.update({
      where: { id: existing.id },
      data: { rankings: JSON.stringify(rankings) },
    });
  } else {
    await db.activityLeaderboardCache.create({
      data: {
        courseId: targetCourseId,
        activityType: "codelab",
        rankings: JSON.stringify(rankings),
      },
    });
  }
}
