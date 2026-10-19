"use server";

import { db } from "@/lib/db";
import { executeSkill } from "./index";
import type { SkillResult } from "./index";

const CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed ambiguous chars: 0/O, 1/I
const CODE_LENGTH = 6;

/**
 * Agentic Skill: Generate Course Code
 *
 * Generates a unique 6-character alphanumeric course join code.
 * Automatically checks for collisions against the database.
 * Can be called programmatically for batch course creation.
 */
export async function generateCourseCode(): Promise<SkillResult<string>> {
  return executeSkill("generateCourseCode", async () => {
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      let code = "";
      for (let i = 0; i < CODE_LENGTH; i++) {
        code += CHARSET[Math.floor(Math.random() * CHARSET.length)];
      }

      const existing = await db.course.findUnique({
        where: { courseCode: code },
        select: { id: true },
      });

      if (!existing) {
        return code;
      }

      attempts++;
    }

    throw new Error(
      "Failed to generate unique course code after maximum attempts"
    );
  });
}
