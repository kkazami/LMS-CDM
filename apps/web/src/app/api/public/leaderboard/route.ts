import { getInstituteName } from "@lms/types";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export interface PublicLeaderboardEntry {
  id: string;
  rank: number;
  displayName: string;
  avatar: string | null;
  points: number;
  exp: number;
  tier: string;
  program: string;
}

let pending: Promise<PublicLeaderboardEntry[]> | null = null;
let retryAt = 0;
const retrySeconds = 60;
const headers = { 'Cache-Control': 'no-store' };

function unavailable() {
  return NextResponse.json({ entries: [], message: 'The leaderboard is temporarily unavailable. Please try again later.' }, {
    status: 503, headers: { ...headers, 'Retry-After': String(Math.max(1, Math.ceil((retryAt - Date.now()) / 1000))) },
  });
}

function failureReason(error: unknown): string {
  const queue: unknown[] = [error];
  const seen = new Set<unknown>();
  while (queue.length && seen.size < 12) {
    const node = queue.shift();
    if (!node || typeof node !== 'object' || seen.has(node)) continue;
    seen.add(node);
    const detail = node as Record<string, unknown>;
    if (['code', 'originalCode', 'sqlState'].some(key => detail[key] === '53000') || typeof detail.message === 'string' && /exceeded the quota/i.test(detail.message)) return 'database_quota_exceeded';
    queue.push(detail.cause, detail.meta, detail.driverAdapterError);
  }
  return 'leaderboard_unavailable';
}

async function loadEntries(): Promise<PublicLeaderboardEntry[]> {
    const profiles = await db.gamificationProfile.findMany({
      where: {
        OR: [
          { exp: { gt: 0 } },
          { totalPoints: { gt: 0 } },
        ],
        student: {
          role: "STUDENT",
          isActive: true,
        },
      },
      select: {
        id: true,
        exp: true,
        totalPoints: true,
        levelTier: true,
        isLeaderboardAnonymized: true,
        student: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            department: true,
            institute: {
              select: {
                name: true,
                code: true,
              },
            },
          },
        },
      },
      orderBy: [
        { exp: "desc" },
        { totalPoints: "desc" },
      ],
      take: 10,
    });

    const entries: PublicLeaderboardEntry[] = profiles.map((p, idx) => {
      const isAnon = p.isLeaderboardAnonymized;
      const points = p.exp > 0 ? p.exp : p.totalPoints;
      const rawTier = p.levelTier || "newcomer";
      const tier = rawTier.charAt(0).toUpperCase() + rawTier.slice(1);
      const program =
        p.student.department?.trim() ||
        (p.student.institute ? getInstituteName(p.student.institute.code, p.student.institute.name) : '') ||
        "General";

      return {
        id: p.student.id,
        rank: idx + 1,
        displayName: isAnon
          ? `Student #${p.student.id.slice(-4).toUpperCase()}`
          : p.student.name,
        avatar: isAnon || p.student.avatarUrl?.startsWith('/api/assets/') ? null : p.student.avatarUrl,
        points,
        exp: points,
        tier,
        program,
      };
    });

    return entries;
}

export async function GET() {
  if (Date.now() < retryAt) return unavailable();
  // Coalesce concurrent public reads, and pause requests after an outage. Never serve stale identities.
  if (!pending) pending = loadEntries().catch(error => {
    retryAt = Date.now() + retrySeconds * 1000;
    console.warn('[PUBLIC_LEADERBOARD_UNAVAILABLE]', failureReason(error));
    throw error;
  }).finally(() => { pending = null; });
  try { return NextResponse.json({ entries: await pending }, { headers }); }
  catch { return unavailable(); }
}
