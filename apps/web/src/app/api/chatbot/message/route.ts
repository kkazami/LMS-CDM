import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import Groq from "groq-sdk";
import { db } from "@/lib/db";
import { visibleSyllabusForms } from '@/lib/forms/visibility';
import { getSessionFromRequest } from "@/lib/api-auth";
import { getCorsHeaders, handleCorsPreflight } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return handleCorsPreflight(request) ?? new NextResponse(null, { status: 204 });
}

function getGroqApiKey(): string {
  let key = (process.env.GROQ_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (
    !key ||
    key.toLowerCase().includes("your") ||
    key.toLowerCase().includes("api-key") ||
    key.toLowerCase().includes("placeholder") ||
    key.length < 15
  ) {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "apps/web/.env"),
        path.resolve(process.cwd(), "apps/web/.env.local"),
        path.resolve(process.cwd(), "../../.env"),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          const match = content.match(/^GROQ_API_KEY=(.*)$/m);
          if (match) {
            const parsed = match[1].trim().replace(/^["']|["']$/g, "");
            if (
              parsed &&
              !parsed.toLowerCase().includes("your") &&
              !parsed.toLowerCase().includes("api-key") &&
              !parsed.toLowerCase().includes("placeholder") &&
              parsed.length >= 15
            ) {
              return parsed;
            }
          }
        }
      }
    } catch {
      // fallback to key
    }
  }
  return key;
}

async function callGroqFallback({
  systemInstruction,
  history,
  message,
  temperature,
}: {
  systemInstruction: string;
  history?: IncomingMessage[];
  message: string;
  temperature: number;
}): Promise<string | null> {
  const apiKey = getGroqApiKey();
  if (!apiKey) {
    console.warn("[Chatbot Fallback] Cannot fallback to Groq: GROQ_API_KEY is not configured.");
    return null;
  }

  const preferredModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const candidateModels = Array.from(
    new Set([preferredModel, "openai/gpt-oss-120b", "qwen/qwen3.8-27b"])
  );

  console.log(`[Chatbot Fallback] Triggering Groq fallback (preferred: ${preferredModel}) using identical system prompt and grounded data context...`);

  const groq = new Groq({ apiKey });

  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: systemInstruction },
  ];

  if (Array.isArray(history) && history.length > 0) {
    const recentHistory = history.slice(-6);
    for (const h of recentHistory) {
      if (!h.text) continue;
      messages.push({
        role: h.role === "user" ? "user" : "assistant",
        content: h.text,
      });
    }
  }

  messages.push({
    role: "user",
    content: message,
  });

  for (const model of candidateModels) {
    try {
      const completion = await groq.chat.completions.create({
        model,
        messages,
        temperature,
      });

      const reply = completion.choices?.[0]?.message?.content || null;
      if (reply) {
        console.log(`[Chatbot Fallback] Groq (${model}) successfully generated response.`);
        return reply;
      }
    } catch (err: any) {
      console.warn(`[Chatbot Fallback] Groq model [${model}] failed: ${err?.message || err}`);
      if (err?.status === 401 || err?.status === 429) {
        throw err;
      }
    }
  }

  return null;
}

function getGeminiApiKey(): string {
  let key = (process.env.GEMINI_API_KEY || "").trim().replace(/^["']|["']$/g, "");
  if (
    !key ||
    key.toLowerCase().includes("your") ||
    key.toLowerCase().includes("api-key") ||
    key.toLowerCase().includes("placeholder") ||
    key.length < 20
  ) {
    try {
      const candidatePaths = [
        path.resolve(process.cwd(), ".env"),
        path.resolve(process.cwd(), ".env.local"),
        path.resolve(process.cwd(), "apps/web/.env"),
        path.resolve(process.cwd(), "apps/web/.env.local"),
        path.resolve(process.cwd(), "../../.env"),
      ];
      for (const p of candidatePaths) {
        if (fs.existsSync(p)) {
          const content = fs.readFileSync(p, "utf8");
          const match = content.match(/^GEMINI_API_KEY=(.*)$/m);
          if (match) {
            const parsed = match[1].trim().replace(/^["']|["']$/g, "");
            if (
              parsed &&
              !parsed.toLowerCase().includes("your") &&
              !parsed.toLowerCase().includes("api-key") &&
              !parsed.toLowerCase().includes("placeholder") &&
              parsed.length >= 20
            ) {
              return parsed;
            }
          }
        }
      }
    } catch {
      // fallback to key
    }
  }
  return key;
}

// In-memory sliding window rate limiter: 15 messages per 60 seconds per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 15;

function checkChatbotRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = rateLimitMap.get(userId) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (validTimestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitMap.set(userId, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(userId, validTimestamps);
  return true;
}

interface IncomingMessage {
  role: "user" | "bot" | "model";
  text: string;
}

export async function POST(request: Request) {
  const corsHeaders = getCorsHeaders(request);

  try {
    // 1. Authenticate user from session
    const session = await getSessionFromRequest(request);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: "Unauthorized: Please log in to use the CdM Assistant." },
        { status: 401, headers: corsHeaders }
      );
    }

    const userId = session.user.id;
    const rawRole = (session.user.role as string || "STUDENT").toUpperCase();
    const isInstructor = rawRole === "PROFESSOR" || rawRole === "TEACHER" || rawRole === "ADMIN";
    const userName = (session.user.name as string) || "User";

    // 2. Rate limiting check
    if (!checkChatbotRateLimit(userId)) {
      return NextResponse.json(
        {
          reply: "You're sending messages a bit too fast. Please wait a moment before asking again.",
          rateLimited: true,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    // 3. Parse request payload
    const body = await request.json();
    const { message, history } = body as {
      message?: string;
      history?: IncomingMessage[];
    };

    if (!message || typeof message !== "string" || !message.trim()) {
      return NextResponse.json(
        { error: "Message content is required." },
        { status: 400, headers: corsHeaders }
      );
    }

    // 4. Grounding: Fetch real data from Prisma based on verified role
    let systemInstruction = "";

    if (!isInstructor) {
      // ── STUDENT DATA GROUNDING ──
      const enrollments = await db.enrollment.findMany({
        where: { studentId: userId, status: "APPROVED" },
        include: {
          course: {
            select: {
              id: true,
              code: true,
              title: true,
              instructor: { select: { name: true, email: true } },
            },
          },
        },
      });

      const enrolledCourseIds = enrollments.map((e) => e.courseId);

      // Pending and upcoming tasks / deadlines
      const syllabusItems = await db.syllabusItem.findMany({
        where: {
          courseId: { in: enrolledCourseIds },
          type: { in: ["ASSIGNMENT", "QUIZ", "EXAM"] },
          AND: [await visibleSyllabusForms(undefined, userId)],
        },
        include: {
          course: { select: { code: true, title: true } },
          submissions: {
            where: { studentId: userId },
            select: { status: true, grade: true, isReturned: true },
          },
        },
        orderBy: { dueDate: "asc" },
      });

      // Recent graded submissions
      const gradedSubmissions = await db.studentSubmission.findMany({
        where: {
          studentId: userId,
          isReturned: true,
        },
        include: {
          syllabusItem: {
            select: {
              title: true,
              maxPoints: true,
              course: { select: { code: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 10,
      });

      // Recent course announcements
      const recentAnnouncements = await db.announcement.findMany({
        where: { courseId: { in: enrolledCourseIds } },
        include: {
          course: { select: { code: true, title: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      const coursesContext = enrollments
        .map(
          (e) =>
            `- ${e.course.code}: "${e.course.title}" (Instructor: ${e.course.instructor?.name || "TBA"})`
        )
        .join("\n");

      const now = new Date();
      const deadlinesContext = syllabusItems
        .map((item) => {
          const submission = item.submissions[0];
          const status = submission
            ? submission.isReturned
              ? `Graded (${submission.grade ?? 0}/${item.maxPoints})`
              : "Submitted"
            : item.dueDate && new Date(item.dueDate) < now
            ? "Missing / Overdue"
            : "Pending";

          const dueStr = item.dueDate
            ? new Date(item.dueDate).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })
            : "No due date";

          return `- [${item.course.code}] ${item.title} (${item.type}): Due ${dueStr} — Status: ${status}`;
        })
        .join("\n");

      const gradesContext = gradedSubmissions
        .map(
          (g) =>
            `- [${g.syllabusItem.course.code}] ${g.syllabusItem.title}: ${g.grade}/${g.syllabusItem.maxPoints} pts`
        )
        .join("\n");

      const announcementsContext = recentAnnouncements
        .map(
          (a) =>
            `- [${a.course.code}] (${new Date(a.createdAt).toLocaleDateString()}): ${a.content.slice(0, 150)}`
        )
        .join("\n");

      const currentDateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      systemInstruction = `You are the official CdM Assistant (Colegio de Montalban AI Learning Assistant) for the student ${userName}.
You are helpful, encouraging, concise, and focused on helping students succeed academically and navigate the CdM LMS.

═══ REAL STUDENT CONTEXT (USE THIS FACTUAL DATA) ═══
Today's Date: ${currentDateStr}
Enrolled Courses:
${coursesContext || "None currently enrolled."}

Coursework & Deadlines:
${deadlinesContext || "No assignments or quizzes recorded."}

Recent Graded Submissions:
${gradesContext || "No graded work returned yet."}

Recent Announcements:
${announcementsContext || "No active announcements."}
════════════════════════════════════════════════════

═══ CRITICAL ACADEMIC INTEGRITY GUARDRAILS (STRICTLY ENFORCED) ═══
1. YOU MUST NEVER complete graded assignments, write essays, generate full code solutions, or provide direct answers to quiz/exam/homework problems on the student's behalf.
2. If the student asks you to do their work (e.g., "write my essay about X", "solve this quiz question for me", "write the complete code for my assignment", "give me the answers"):
   - Politeness & Redirection: Clearly decline to complete the work for them.
   - Socratic Tutoring: Offer to explain the underlying core concepts, provide an outline or brainstorming ideas, break the problem into smaller logical steps, or point them to the relevant coursework.
   - Example response tone: "I can't write your essay/assignment for you, but I'd be happy to help you brainstorm an outline, understand the key concepts, or review a draft you've written!"
3. You CAN and SHOULD assist with:
   - Checking upcoming deadlines, pending homework, grades, and announcements using the real context above.
   - Explaining difficult academic concepts and providing analogies.
   - Study strategies, time management, and test prep tips.
   - Navigating features of the CdM LMS (Grades tab, Submissions, Announcements, Codelab, Flashcards).
4. Always respond concisely and format with clear markdown bullet points when listing items.`;
    } else {
      // ── INSTRUCTOR DATA GROUNDING ──
      const taughtCourses = await db.course.findMany({
        where: { instructorId: userId },
        include: {
          _count: {
            select: {
              enrollments: { where: { status: "APPROVED" } },
              syllabusItems: true,
            },
          },
        },
      });

      const taughtCourseIds = taughtCourses.map((c) => c.id);

      // Submissions pending grading
      const pendingSubmissions = await db.studentSubmission.findMany({
        where: {
          syllabusItem: { courseId: { in: taughtCourseIds } },
          status: "SUBMITTED",
          isReturned: false,
        },
        include: {
          syllabusItem: {
            select: { title: true, course: { select: { code: true } } },
          },
          student: { select: { name: true, email: true } },
        },
        take: 15,
      });

      // At-risk analytics for taught courses
      const atRiskEnrollments = await db.enrollment.findMany({
        where: {
          courseId: { in: taughtCourseIds },
          status: "APPROVED",
        },
        include: {
          course: { select: { code: true, title: true } },
          student: {
            select: {
              id: true,
              name: true,
              email: true,
              submissions: {
                where: { syllabusItem: { courseId: { in: taughtCourseIds } } },
                select: { grade: true, isReturned: true },
              },
            },
          },
        },
      });

      // Calculate simple at-risk indicators for instructor summary
      const atRiskSummary: string[] = [];
      atRiskEnrollments.forEach((e) => {
        const graded = e.student.submissions.filter((s) => s.isReturned && s.grade !== null);
        if (graded.length > 0) {
          const avg = graded.reduce((acc, s) => acc + (s.grade || 0), 0) / graded.length;
          if (avg < 75) {
            atRiskSummary.push(`- ${e.student.name} (${e.student.email}) in ${e.course.code}: Average grade ${avg.toFixed(1)}% (Needs Intervention)`);
          }
        }
      });

      const instructorCoursesContext = taughtCourses
        .map(
          (c) =>
            `- [${c.code}] "${c.title}": ${c._count.enrollments} enrolled students, ${c._count.syllabusItems} syllabus items`
        )
        .join("\n");

      const pendingGradingContext = pendingSubmissions
        .map(
          (s) =>
            `- [${s.syllabusItem.course.code}] ${s.student.name} submitted "${s.syllabusItem.title}"`
        )
        .join("\n");

      const currentDateStr = new Date().toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      systemInstruction = `You are the official CdM Assistant (Colegio de Montalban Faculty AI Assistant) for Instructor ${userName}.
You are an intelligent, professional teaching and course management assistant.

═══ INSTRUCTOR CONTEXT & ASSIGNED COURSES ═══
Today's Date: ${currentDateStr}
Taught Courses:
${instructorCoursesContext || "No active courses currently assigned."}

Submissions Awaiting Grading:
${pendingGradingContext || "No submissions currently pending grading."}

Students Needing Attention / Low Average (<75%):
${atRiskSummary.slice(0, 8).join("\n") || "No students currently flagged below passing threshold."}
════════════════════════════════════════════════

═══ INSTRUCTOR CAPABILITIES & DATA SCOPING ═══
1. INSTRUCTOR FREEDOM: Unlike students, instructors ARE fully permitted to ask for:
   - Drafting official course announcements, notices, and reminders.
   - Formulating assignment descriptions, quiz questions, and rubric criteria.
   - Summarizing student performance, submission rates, and at-risk metrics.
   - Generating feedback templates and lecture explanations.
   You should assist with all such drafting and instructional requests directly and professionally!
   DATE AWARENESS: Today's actual date is ${currentDateStr}. When drafting announcements, notices, or scheduling dates, ALWAYS use today's actual date as the announcement publication date header, and calculate relative dates (such as "next Monday" or "this Friday") accurately relative to today (${currentDateStr}). Never use placeholders like "(or current date)", "[Insert Date]", or hallucinated years!
2. DATA ISOLATION RULE: You ONLY have access to the courses and students listed in the context above (${taughtCourses.map((c) => c.code).join(", ") || "none"}).
   If the instructor asks about a course or student they do NOT teach, explicitly inform them that you do not have access to that course or student's records, and protect student privacy.
3. Keep communications clear, professional, and formatted in clean markdown.`;
    }

    // 5. Check API Key
    const rawApiKey = getGeminiApiKey();
    const isPlaceholder =
      !rawApiKey ||
      rawApiKey.toLowerCase().includes("your") ||
      rawApiKey.toLowerCase().includes("api-key") ||
      rawApiKey.toLowerCase().includes("placeholder") ||
      rawApiKey.length < 20;

    if (isPlaceholder) {
      // Check if Groq fallback is available
      const groqKey = getGroqApiKey();
      if (groqKey) {
        console.warn("[Chatbot Fallback] Gemini API key not configured. Falling back to Groq directly...");
        const groqReply = await callGroqFallback({
          systemInstruction,
          history,
          message,
          temperature: isInstructor ? 0.7 : 0.4,
        });
        if (groqReply) {
          return NextResponse.json(
            { reply: groqReply, role: rawRole, provider: "groq" },
            { headers: corsHeaders }
          );
        }
      }

      return NextResponse.json(
        {
          reply:
            "⚠️ **CdM Assistant Setup Note**: Neither Gemini API key (`GEMINI_API_KEY`) nor Groq fallback key (`GROQ_API_KEY`) is configured in the server environment. Please configure at least one API key in `.env` to enable live responses.",
        },
        { headers: corsHeaders }
      );
    }

    // 6. Initialize Google GenAI client
    // Primary model: gemini-3.1-flash-lite (high efficiency, fast latency, budget-friendly tier)
    // Fallback chain: gemini-3.5-flash-lite -> gemini-flash-latest -> Groq (llama-3.3-70b-versatile)
    const ai = new GoogleGenAI({ apiKey: rawApiKey });
    const modelName = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";

    // Build multi-turn contents from history if provided
    const contents: Array<{ role: "user" | "model"; parts: [{ text: string }] }> = [];

    if (Array.isArray(history) && history.length > 0) {
      // Keep last 6 messages to stay concise and maintain low latency
      const recentHistory = history.slice(-6);
      for (const h of recentHistory) {
        if (!h.text) continue;
        const mappedRole = h.role === "user" ? "user" : "model";
        contents.push({
          role: mappedRole,
          parts: [{ text: h.text }],
        });
      }
    }

    // Append current user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    // 7. Invoke Gemini (primary + fallback models), then Groq fallback
    let replyText = "";
    let providerUsed = "gemini";
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction,
          temperature: isInstructor ? 0.7 : 0.4, // lower temperature for students to enforce strict guardrail adherence
        },
      });

      replyText = response.text || "";
    } catch (genErr: any) {
      console.warn(`[Chatbot] Gemini primary model [${modelName}] failed (${genErr?.message || genErr}). Trying Gemini fallback models...`);

      // Fallback model chain within Gemini:
      const fallbackModels = ["gemini-3.5-flash-lite", "gemini-flash-latest"].filter(
        (m) => m !== modelName
      );

      for (const fallbackModel of fallbackModels) {
        try {
          const fallbackRes = await ai.models.generateContent({
            model: fallbackModel,
            contents,
            config: {
              systemInstruction,
              temperature: isInstructor ? 0.7 : 0.4,
            },
          });
          if (fallbackRes.text) {
            replyText = fallbackRes.text;
            break;
          }
        } catch (fallbackErr: any) {
          console.warn(`[Chatbot] Gemini fallback model [${fallbackModel}] failed: ${fallbackErr?.message || fallbackErr}`);
        }
      }

      // If all Gemini models failed (rate limit 429, quota exhaustion, outage, or any API error)
      if (!replyText) {
        console.warn(
          `[Chatbot Fallback] Gemini models exhausted. Triggering automatic fallback to Groq (llama-3.3-70b-versatile)... Reason: ${genErr?.message || "Unknown error"}`
        );
        try {
          const groqReply = await callGroqFallback({
            systemInstruction,
            history,
            message,
            temperature: isInstructor ? 0.7 : 0.4,
          });

          if (groqReply) {
            replyText = groqReply;
            providerUsed = "groq";
            console.log("[Chatbot Fallback] Successfully served request using Groq fallback.");
          }
        } catch (groqErr: any) {
          console.error("[Chatbot Fallback] Groq fallback also failed:", groqErr?.message || groqErr);
        }
      }

      if (!replyText) {
        return NextResponse.json(
          {
            reply: "The assistant is busy, try again in a moment.",
            rateLimited: true,
          },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    return NextResponse.json(
      {
        reply: replyText,
        role: rawRole,
        provider: providerUsed,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    console.error("Chatbot API Fatal Error:", err);
    return NextResponse.json(
      { error: "Failed to process message." },
      { status: 500, headers: corsHeaders }
    );
  }
}
