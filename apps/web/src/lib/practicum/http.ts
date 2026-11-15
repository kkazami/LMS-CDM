import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export const PRACTICUM_RUBRIC_TRANSACTION_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

export const PRACTICUM_DB_NOT_MIGRATED_MESSAGE =
  "Practicum database tables or columns have not been migrated yet. Please ask the database administrator to apply the pending Prisma migrations.";

export const PRACTICUM_DB_MISSING_PRIVILEGES_MESSAGE =
  "Database role is missing required table permissions for Practicum. Please ask the database administrator to grant SELECT, INSERT, UPDATE, and DELETE privileges.";

export const PRACTICUM_DB_TIMEOUT_MESSAGE =
  "The database took too long to save the placement. Please try again.";

export const PRACTICUM_INTERNAL_ERROR_MESSAGE = "Internal error.";

export type PracticumApiErrorKind =
  | "VALIDATION"
  | "FILE_TOO_LARGE"
  | "WRONG_FILE_TYPE"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "DATABASE_NOT_MIGRATED"
  | "MISSING_PRIVILEGES"
  | "TRANSACTION_TIMEOUT"
  | "UNKNOWN";

export interface ClassifiedPracticumApiError {
  kind: PracticumApiErrorKind;
  status: number;
  message: string;
}

function isStatusError(err: unknown): err is { status: number; message: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    typeof (err as { status?: unknown }).status === "number" &&
    typeof (err as { message?: unknown }).message === "string"
  );
}

function extractDatabaseCodesAndMessage(err: unknown): {
  prismaCode: string;
  sqlCode: string;
  causeKind: string;
  message: string;
} {
  if (!err || typeof err !== "object") {
    return { prismaCode: "", sqlCode: "", causeKind: "", message: "" };
  }
  const record = err as Record<string, unknown>;
  const prismaCode = typeof record.code === "string" ? record.code : "";
  const meta =
    record.meta && typeof record.meta === "object"
      ? (record.meta as Record<string, unknown>)
      : null;
  const driverAdapterError =
    meta?.driverAdapterError && typeof meta.driverAdapterError === "object"
      ? (meta.driverAdapterError as Record<string, unknown>)
      : record.driverAdapterError && typeof record.driverAdapterError === "object"
        ? (record.driverAdapterError as Record<string, unknown>)
        : null;
  const cause =
    driverAdapterError?.cause && typeof driverAdapterError.cause === "object"
      ? (driverAdapterError.cause as Record<string, unknown>)
      : record.cause && typeof record.cause === "object"
        ? (record.cause as Record<string, unknown>)
        : null;

  const sqlCode =
    typeof cause?.originalCode === "string"
      ? cause.originalCode
      : typeof cause?.code === "string"
        ? cause.code
        : typeof meta?.code === "string"
          ? meta.code
          : typeof record.originalCode === "string"
            ? record.originalCode
            : "";

  const causeKind = typeof cause?.kind === "string" ? cause.kind : "";
  const topMessage = typeof record.message === "string" ? record.message : "";
  const causeMessage =
    typeof cause?.originalMessage === "string"
      ? cause.originalMessage
      : typeof cause?.message === "string"
        ? cause.message
        : "";
  const message = causeMessage ? `${topMessage}\n${causeMessage}` : topMessage;

  return { prismaCode, sqlCode, causeKind, message };
}

export function isUniqueViolation(err: unknown): boolean {
  const { prismaCode, sqlCode } = extractDatabaseCodesAndMessage(err);
  return prismaCode === "P2002" || sqlCode === "23505";
}

export function isPracticumDatabaseNotMigratedError(err: unknown): boolean {
  const { prismaCode, sqlCode, causeKind, message } = extractDatabaseCodesAndMessage(err);
  if (prismaCode === "P2021" || prismaCode === "P2022") return true;
  if (sqlCode === "42P01" || sqlCode === "42703") return true;
  if (causeKind === "TableDoesNotExist" || causeKind === "ColumnDoesNotExist") return true;
  if (
    /column\s+.*does not exist/i.test(message) ||
    /relation\s+.*does not exist/i.test(message) ||
    /table\s+.*does not exist/i.test(message)
  ) {
    return true;
  }
  return false;
}

export function isPracticumMissingPrivilegesError(err: unknown): boolean {
  const { prismaCode, sqlCode, causeKind, message } = extractDatabaseCodesAndMessage(err);
  if (prismaCode === "42501" || sqlCode === "42501") return true;
  if (causeKind === "InsufficientPrivilege") return true;
  if (
    /permission denied for (table|schema|sequence|relation)/i.test(message) ||
    /must be owner of (table|relation)/i.test(message)
  ) {
    return true;
  }
  return false;
}

export function isPracticumTransactionTimeoutError(err: unknown): boolean {
  const { prismaCode, sqlCode, message } = extractDatabaseCodesAndMessage(err);
  if (prismaCode === "P2028" || prismaCode === "P2024" || prismaCode === "P2034") return true;
  if (sqlCode === "57014" || sqlCode === "55P03" || sqlCode === "40P01" || sqlCode === "40001") {
    return true;
  }
  if (
    /expired transaction/i.test(message) ||
    /transaction timeout/i.test(message) ||
    /Unable to start a transaction in the given time/i.test(message)
  ) {
    return true;
  }
  return false;
}

/**
 * Classifies an error from a Practicum API route into a specific, safe response for known
 * failures (validation, file too large, wrong file type, duplicate placement, database not
 * migrated, missing database privileges, or transaction timeout) while keeping unknown errors
 * generic ("Internal error.") for the user.
 */
export function classifyPracticumApiError(err: unknown): ClassifiedPracticumApiError {
  if (err instanceof ZodError) {
    const first = err.issues[0];
    const where = first?.path.length ? `${first.path.join(".")}: ` : "";
    const msg = `${where}${first?.message ?? "Invalid request."}`;
    return {
      kind: "VALIDATION",
      status: 400,
      message: msg,
    };
  }

  if (isPracticumDatabaseNotMigratedError(err)) {
    return {
      kind: "DATABASE_NOT_MIGRATED",
      status: 503,
      message: PRACTICUM_DB_NOT_MIGRATED_MESSAGE,
    };
  }

  if (isPracticumMissingPrivilegesError(err)) {
    return {
      kind: "MISSING_PRIVILEGES",
      status: 503,
      message: PRACTICUM_DB_MISSING_PRIVILEGES_MESSAGE,
    };
  }

  if (isPracticumTransactionTimeoutError(err)) {
    return {
      kind: "TRANSACTION_TIMEOUT",
      status: 503,
      message: PRACTICUM_DB_TIMEOUT_MESSAGE,
    };
  }

  if (isUniqueViolation(err)) {
    return {
      kind: "CONFLICT",
      status: 409,
      message: "This student already has a placement for that school year.",
    };
  }

  if (err instanceof HttpError || isStatusError(err)) {
    const msg = err.message.trim() || "Invalid request.";
    if (
      err.status === 413 ||
      /file too large|maximum file size|payload too large|entity too large/i.test(msg)
    ) {
      return {
        kind: "FILE_TOO_LARGE",
        status: err.status === 413 ? 413 : 400,
        message: msg,
      };
    }
    if (
      err.status === 400 &&
      /invalid file type|allowed (file )?types|does not match its \.[a-z0-9]+ extension|choose a valid rubric file/i.test(
        msg
      )
    ) {
      return {
        kind: "WRONG_FILE_TYPE",
        status: 400,
        message: msg,
      };
    }
    if (err.status === 401) {
      return { kind: "UNAUTHENTICATED", status: 401, message: msg };
    }
    if (err.status === 403) {
      return { kind: "FORBIDDEN", status: 403, message: msg };
    }
    if (err.status === 404) {
      return { kind: "NOT_FOUND", status: 404, message: msg };
    }
    if (err.status === 409) {
      return { kind: "CONFLICT", status: 409, message: msg };
    }
    if (err.status >= 400 && err.status < 500) {
      return { kind: "VALIDATION", status: err.status, message: msg };
    }
    return { kind: "VALIDATION", status: err.status, message: msg };
  }

  return {
    kind: "UNKNOWN",
    status: 500,
    message: PRACTICUM_INTERNAL_ERROR_MESSAGE,
  };
}

/** Maps anything thrown inside a route handler to a JSON error response and logs server errors. */
export function errorResponse(err: unknown, logContext = "[PRACTICUM_API_ERROR]"): NextResponse {
  const classified = classifyPracticumApiError(err);
  if (classified.status >= 500 || logContext !== "[PRACTICUM_API_ERROR]") {
    console.error(logContext, err);
  }
  return NextResponse.json(
    { error: classified.message, message: classified.message, code: classified.kind },
    { status: classified.status }
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body.");
  }
}
