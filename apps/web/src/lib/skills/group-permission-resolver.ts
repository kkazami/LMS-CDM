"use server";

import { db } from "@/lib/db";
import { executeSkill } from "./index";
import type { SkillResult } from "./index";

interface PermissionResolution {
  visibleItemIds: string[];
  hiddenItemIds: string[];
  totalItems: number;
  studentGroupIds: string[];
}

/**
 * Agentic Skill: Group Permission Resolver
 *
 * Resolves which syllabus items a specific student can see,
 * based on their group memberships within a course.
 *
 * Rules:
 * - If a syllabus item has NO target groups → visible to ALL students
 * - If a syllabus item has target groups → visible ONLY to students
 *   who are members of at least one of those groups
 */
export async function resolveGroupPermissions(
  courseId: string,
  studentId: string
): Promise<SkillResult<PermissionResolution>> {
  return executeSkill("resolveGroupPermissions", async () => {
    // 1. Get all groups the student belongs to in this course
    const studentMemberships = await db.studentGroupMember.findMany({
      where: {
        studentId,
        group: { courseId },
      },
      select: { groupId: true },
    });

    const studentGroupIds = studentMemberships.map((m) => m.groupId);

    // 2. Get all syllabus items for this course with their target groups
    const allItems = await db.syllabusItem.findMany({
      where: { courseId },
      include: {
        targetGroups: {
          select: { groupId: true },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const visibleItemIds: string[] = [];
    const hiddenItemIds: string[] = [];

    for (const item of allItems) {
      if (item.targetGroups.length === 0) {
        // No target groups = visible to all
        visibleItemIds.push(item.id);
      } else {
        // Check if student is in at least one target group
        const hasAccess = item.targetGroups.some((tg) =>
          studentGroupIds.includes(tg.groupId)
        );
        if (hasAccess) {
          visibleItemIds.push(item.id);
        } else {
          hiddenItemIds.push(item.id);
        }
      }
    }

    return {
      visibleItemIds,
      hiddenItemIds,
      totalItems: allItems.length,
      studentGroupIds,
    };
  });
}
