import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/api-auth";
import { db } from "@/lib/db";
import {
  executeOneTimeIteProgramSelection,
  loadActiveIteStudentProgramsFromDb,
} from "@/lib/ite-programs/registration";
import { denyLegacyApi } from "@/lib/super-user-v1/legacy-entry-guard";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const ceilingDenial = await denyLegacyApi(
    request,
    "POST api/ite/program/select/route.ts"
  );
  if (ceilingDenial) return ceilingDenial;

  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      );
    }

    let body: { program?: unknown } = {};
    try {
      body = (await request.json()) as { program?: unknown };
    } catch {
      return NextResponse.json(
        { message: "Invalid JSON request body." },
        { status: 400 }
      );
    }

    const result = await executeOneTimeIteProgramSelection({
      userId: session.user.id,
      rawProgram: body?.program,
      store: {
        findStudentRecord: async (userId) => {
          return db.user.findUnique({
            where: { id: userId },
            select: {
              id: true,
              role: true,
              department: true,
              section: true,
              institute: { select: { id: true, code: true } },
              programMemberships: {
                where: { isActive: true },
                select: {
                  isActive: true,
                  kind: true,
                  program: { select: { code: true, name: true } },
                },
              },
              enrollments: {
                where: { status: "APPROVED" },
                select: {
                  status: true,
                  course: {
                    select: {
                      section: true,
                      program: { select: { code: true, name: true } },
                    },
                  },
                },
              },
            },
          });
        },
        loadItePrograms: loadActiveIteStudentProgramsFromDb,
        conditionalSetDepartment: async ({
          userId,
          instituteId,
          expectedCurrentDepartment,
          newProgramCode,
        }) => {
          const updated = await db.user.updateMany({
            where: {
              id: userId,
              instituteId,
              role: { in: ["STUDENT", "student"] },
              department: expectedCurrentDepartment,
              programMemberships: {
                none: { isActive: true, kind: "STUDENT" },
              },
            },
            data: {
              department: newProgramCode,
            },
          });
          return updated.count;
        },
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { message: result.message },
        { status: result.status }
      );
    }

    return NextResponse.json(
      {
        message: "Academic program saved and locked.",
        program: {
          code: result.programCode,
          name: result.programName,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("ITE_PROGRAM_SELECT_ERROR", error);
    return NextResponse.json(
      { message: "Unable to save academic program. Please try again." },
      { status: 500 }
    );
  }
}

