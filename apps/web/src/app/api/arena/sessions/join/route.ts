import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";

export const dynamic = "force-dynamic";

/**
 * POST /api/arena/sessions/join
 * Student joins an active Arena game using the 6-digit game PIN.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json({ message: "Unauthorized. Please log in first." }, { status: 401 });
    }

    const body = await request.json();
    const { pin, nickname } = body;

    if (!pin || typeof pin !== "string" || !pin.trim()) {
      return NextResponse.json({ message: "Game PIN is required." }, { status: 400 });
    }

    const normalizedPin = pin.trim();

    const gameSession = await db.arenaGameSession.findFirst({
      where: {
        pin: normalizedPin,
        status: { not: "FINISHED" },
      },
      include: {
        quiz: {
          select: { title: true },
        },
      },
    });

    if (!gameSession) {
      return NextResponse.json(
        { message: "Game not found or session has ended. Check the PIN and try again." },
        { status: 404 }
      );
    }

    const studentName = (session.user.name as string) || "Player";
    const displayName = nickname?.trim() || studentName;

    // Check if participant already exists (reconnection support)
    let participant = await db.arenaParticipant.findUnique({
      where: {
        sessionId_studentId: {
          sessionId: gameSession.id,
          studentId: session.user.id,
        },
      },
    });

    if (!participant) {
      participant = await db.arenaParticipant.create({
        data: {
          sessionId: gameSession.id,
          studentId: session.user.id,
          nickname: displayName,
          isConnected: true,
          lastActiveAt: new Date(),
        },
      });
    } else {
      // Re-activate connection state
      participant = await db.arenaParticipant.update({
        where: { id: participant.id },
        data: {
          isConnected: true,
          lastActiveAt: new Date(),
          ...(nickname ? { nickname: displayName } : {}),
        },
      });
    }

    return NextResponse.json({
      success: true,
      sessionId: gameSession.id,
      participantId: participant.id,
      nickname: participant.nickname,
      status: gameSession.status,
      quizTitle: gameSession.quiz.title,
    });
  } catch (error) {
    console.error("JOIN_ARENA_SESSION_ERROR", error);
    return NextResponse.json({ message: "Failed to join game session." }, { status: 500 });
  }
}
