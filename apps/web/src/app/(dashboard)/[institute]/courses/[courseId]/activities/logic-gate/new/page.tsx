/**
 * Instructor Logic Gate Activity Template Editor
 * Route: /[institute]/courses/[courseId]/activities/logic-gate/new
 */

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { getInstituteTheme } from "@/lib/get-institute-theme";

const createTemplateSchema = z.object({
  courseId: z.string(),
  difficulty: z.coerce.number().min(1).max(3),
  faultPool: z.array(z.string()),
  targetTruthTable: z.string().optional(),
});

export default async function NewLogicGateActivityPage({
  params,
}: {
  params: Promise<{ institute: string; courseId: string }>;
}) {
  const { institute, courseId } = await params;
  const session = await getSession();
  const theme = getInstituteTheme(institute);

  if (!session || (session.user.role !== "INSTRUCTOR" && session.user.role !== "PROFESSOR" && session.user.role !== "ADMIN")) {
    redirect(`/${institute}/courses/${courseId}`);
  }

  async function createTemplate(formData: FormData) {
    "use strict";
    "use server";
    const sessionInfo = await getSession();
    if (!sessionInfo) throw new Error("Unauthorized");

    const faults = formData.getAll("faultPool") as string[];
    const difficulty = formData.get("difficulty") as string;
    const targetTruthTableStr = formData.get("targetTruthTable") as string;
    
    let parsedTable = null;
    if (targetTruthTableStr && targetTruthTableStr.trim().length > 0) {
      try {
        parsedTable = JSON.parse(targetTruthTableStr);
      } catch (e) {
        throw new Error("Invalid JSON for Target Truth Table");
      }
    }

    const parsed = createTemplateSchema.safeParse({
      courseId,
      difficulty: parseInt(difficulty, 10),
      faultPool: faults,
      targetTruthTable: targetTruthTableStr,
    });

    if (!parsed.success) {
      throw new Error("Validation failed");
    }

    const { data } = parsed;

    const template = await db.activityTemplate.create({
      data: {
        activityType: "logic-gate", 
        courseId: data.courseId,
        difficulty: data.difficulty,
        faultPool: JSON.stringify(data.faultPool),
        variables: JSON.stringify({ targetTruthTable: parsedTable }),
        createdBy: sessionInfo.user.id,
      },
    });

    revalidatePath(`/${institute}/courses/${courseId}`);
    redirect(`/${institute}/courses/${courseId}?createdTemplateId=${template.id}`);
  }

  const availableFaults = [
    { id: "SWAPPED_GATE_OR_TO_XOR", label: "Troubleshooting: Pre-built circuit uses XOR instead of OR" },
    { id: "MISWIRED_INPUT", label: "Troubleshooting: Input B is wired to wrong gate" },
  ];

  const defaultTruthTable = `{
  "inputs": ["inA", "inB"],
  "outputs": ["outY"],
  "rows": [
    {"in": [false, false], "out": [false]},
    {"in": [false, true], "out": [true]},
    {"in": [true, false], "out": [true]},
    {"in": [true, true], "out": [true]}
  ]
}`;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Logic Gate Assignment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure a combinational logic or troubleshooting lab.
        </p>
      </div>

      <form action={createTemplate} className="space-y-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Assignment Type</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="1" defaultChecked className="accent-indigo-600" />
              <span className="text-sm font-medium">Build Mode (Match Truth Table)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="2" className="accent-indigo-600" />
              <span className="text-sm font-medium">Troubleshooting Mode (Fix Broken Circuit)</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Troubleshooting Faults (If Applicable)</h2>
          <div className="space-y-3">
            {availableFaults.map((fault) => (
              <label key={fault.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <input type="checkbox" name="faultPool" value={fault.id} className="mt-1 accent-indigo-600" />
                <div>
                  <span className="block text-sm font-medium text-gray-900">{fault.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Target Truth Table (JSON)</h2>
          <p className="text-xs text-gray-500">Leave blank for a free-build sandbox. Provide JSON to auto-grade combinational logic.</p>
          <textarea 
            name="targetTruthTable" 
            defaultValue={defaultTruthTable}
            rows={10}
            className="w-full font-mono text-sm p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
          />
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit"
            className="px-6 py-2.5 rounded-lg text-white font-medium transition-colors"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Create Assignment Template
          </button>
        </div>
      </form>
    </div>
  );
}
