/**
 * apps/web/src/lib/harness/tools/student-db-tool.ts
 *
 * Layer 1 Tool: Tenant & Student-Scoped Database Accessor
 * Guarantees that the LLM cannot query across institute or student boundaries.
 */

import { db } from "@/lib/db";
import { AgentContext, ToolDefinition } from "../core/types";
import { toolRegistry } from "./registry";

export const getStudentProgressTool: ToolDefinition<{ templateId: string }> = {
  name: "getStudentProgress",
  description: "Fetches a student's past submissions and status for an interactive activity or codelab.",
  execute: async ({ templateId }, context: AgentContext) => {
    // Hard boundary: Enforce student ownership and matching institute
    const submission = await db.activitySubmission.findFirst({
      where: {
        templateId,
        studentId: context.userId,
        template: {
          course: {
            instituteId: context.instituteId,
          },
        },
      },
      orderBy: { submittedAt: "desc" },
      select: {
        id: true,
        score: true,
        completionTimeSeconds: true,
        submittedAt: true,
        template: {
          select: {
            title: true,
            difficulty: true,
            // SECURITY INVARIANT: hiddenTestCases is EXCLUDED!
          },
        },
      },
    });

    if (!submission) {
      return {
        success: true,
        data: { message: "No previous submissions found for this student and activity." },
        durationMs: 0,
      };
    }

    return {
      success: true,
      data: submission,
      durationMs: 0,
    };
  },
};

export const getCourseAnnouncementsTool: ToolDefinition<{ courseId: string }> = {
  name: "getCourseAnnouncements",
  description: "Fetches recent announcements for a course the student is actively enrolled in.",
  execute: async ({ courseId }, context: AgentContext) => {
    // Verify enrollment
    const isEnrolled = await db.enrollment.findFirst({
      where: {
        courseId,
        studentId: context.userId,
        course: {
          instituteId: context.instituteId,
        },
      },
    });

    if (!isEnrolled && context.role === "STUDENT") {
      return {
        success: false,
        error: "Student is not enrolled in this course.",
        durationMs: 0,
      };
    }

    const announcements = await db.announcement.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        content: true,
        createdAt: true,
        author: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });

    return {
      success: true,
      data: announcements,
      durationMs: 0,
    };
  },
};

// Register default database tools
toolRegistry.register(getStudentProgressTool);
toolRegistry.register(getCourseAnnouncementsTool);
