"use server";

import { db } from "@/lib/db";
import { hash } from "bcryptjs";
import { executeSkill } from "./index";
import type { SkillResult } from "./index";
import {
  normalizeRole,
  DEFAULT_ROLE_PERMISSIONS,
  AUDIT_ACTIONS,
} from "@/lib/admin-types";
import { createAuditLog } from "@/lib/rbac";

// ─── Types ───

interface BulkUserIngestionInput {
  /** Raw CSV string — expects headers: name,email,uniqueId,role */
  csvData: string;
  /** Institute code to assign users to */
  instituteCode: string;
  /** Admin user performing the import (for audit trail) */
  actorId: string;
}

interface IngestionRecord {
  row: number;
  email: string;
  success: boolean;
  error?: string;
  userId?: string;
  temporaryPassword?: string;
}

interface BulkIngestionOutput {
  totalRows: number;
  created: number;
  failed: number;
  records: IngestionRecord[];
}

// ─── CSV Parser ───

function parseCSV(raw: string): Array<Record<string, string>> {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) {
    throw new Error("CSV must contain a header row and at least one data row.");
  }

  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/[^a-z0-9]/g, ""));

  const requiredHeaders = ["name", "email"];
  for (const req of requiredHeaders) {
    if (!headers.includes(req)) {
      throw new Error(`CSV is missing required header: "${req}". Found: ${headers.join(", ")}`);
    }
  }

  const rows: Array<Record<string, string>> = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] ?? "";
    }
    rows.push(row);
  }

  return rows;
}

// ─── Skill Implementation ───

/**
 * Agentic Skill: Bulk User Ingestion
 *
 * Parses CSV-formatted data, validates each row, detects duplicate emails,
 * and batch-creates user accounts with auto-generated temporary passwords.
 *
 * CSV Format:
 * ```
 * name,email,uniqueId,role
 * John Doe,john@school.edu,2024-001,STUDENT
 * Jane Smith,jane@school.edu,EMP-042,INSTRUCTOR
 * ```
 *
 * Can be triggered by:
 * - Admin bulk import UI modal
 * - System automation scripts
 * - Future LLM-driven admin workflows
 */
export async function bulkUserIngestion(
  input: BulkUserIngestionInput
): Promise<SkillResult<BulkIngestionOutput>> {
  return executeSkill("bulkUserIngestion", async () => {
    // Validate actor is an admin
    const actor = await db.user.findUnique({
      where: { id: input.actorId },
      select: { role: true, id: true },
    });

    if (!actor || actor.role.toUpperCase() !== "ADMIN") {
      throw new Error("Unauthorized: only ADMIN users can perform bulk ingestion.");
    }

    // Resolve institute
    const institute = await db.institute.findUnique({
      where: { code: input.instituteCode },
    });

    if (!institute) {
      throw new Error(`Institute "${input.instituteCode}" not found.`);
    }

    // Parse CSV
    const csvRows = parseCSV(input.csvData);

    // Pre-fetch existing emails for duplicate detection
    const allEmails = csvRows.map((r) => r.email?.toLowerCase()).filter(Boolean);
    const existingUsers = await db.user.findMany({
      where: { email: { in: allEmails } },
      select: { email: true },
    });
    const existingEmailSet = new Set(existingUsers.map((u) => u.email));
    const batchEmailSet = new Set<string>();

    const records: IngestionRecord[] = [];
    const toCreate: Array<{
      name: string;
      email: string;
      uniqueId: string;
      role: string;
      hashedPassword: string;
      rawPassword: string;
      permissions: string;
      row: number;
    }> = [];

    for (let i = 0; i < csvRows.length; i++) {
      const row = csvRows[i];
      const rowNum = i + 2; // +2 for 1-indexed + header row
      const email = row.email?.toLowerCase()?.trim();
      const name = row.name?.trim();

      // Validate required fields
      if (!name || !email) {
        records.push({
          row: rowNum,
          email: email ?? "MISSING",
          success: false,
          error: "Name and email are required.",
        });
        continue;
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        records.push({
          row: rowNum,
          email,
          success: false,
          error: "Invalid email format.",
        });
        continue;
      }

      // DB duplicate check
      if (existingEmailSet.has(email)) {
        records.push({
          row: rowNum,
          email,
          success: false,
          error: "Email already exists in the system.",
        });
        continue;
      }

      // Batch duplicate check
      if (batchEmailSet.has(email)) {
        records.push({
          row: rowNum,
          email,
          success: false,
          error: "Duplicate email within this CSV batch.",
        });
        continue;
      }

      batchEmailSet.add(email);

      const normalizedRole = row.role ? normalizeRole(row.role) : "STUDENT";
      const dbRole = normalizedRole === "INSTRUCTOR" ? "PROFESSOR" : normalizedRole;
      const rawPassword =
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2);
      const hashedPassword = await hash(rawPassword, 10);

      toCreate.push({
        name,
        email,
        uniqueId: row.uniqueid?.trim() ?? "",
        role: dbRole,
        hashedPassword,
        rawPassword,
        permissions: JSON.stringify(DEFAULT_ROLE_PERMISSIONS[normalizedRole]),
        row: rowNum,
      });
    }

    // Batch create in transaction
    if (toCreate.length > 0) {
      const created = await db.$transaction(
        toCreate.map((u) =>
          db.user.create({
            data: {
              name: u.name,
              email: u.email,
              password: u.hashedPassword,
              uniqueId: u.uniqueId,
              role: u.role,
              isActive: true,
              permissions: u.permissions,
              instituteId: institute.id,
            },
            select: { id: true, email: true },
          })
        )
      );

      for (let i = 0; i < created.length; i++) {
        records.push({
          row: toCreate[i].row,
          email: created[i].email,
          success: true,
          userId: created[i].id,
          temporaryPassword: toCreate[i].rawPassword,
        });
      }
    }

    // Sort records by row number for predictable output
    records.sort((a, b) => a.row - b.row);

    // Audit log
    await createAuditLog({
      adminId: input.actorId,
      targetId: input.actorId,
      action: AUDIT_ACTIONS.BULK_IMPORT,
      metadata: {
        source: "agentic-skill",
        totalRows: csvRows.length,
        created: records.filter((r) => r.success).length,
        failed: records.filter((r) => !r.success).length,
        instituteCode: input.instituteCode,
      },
    });

    return {
      totalRows: csvRows.length,
      created: records.filter((r) => r.success).length,
      failed: records.filter((r) => !r.success).length,
      records,
    };
  });
}
