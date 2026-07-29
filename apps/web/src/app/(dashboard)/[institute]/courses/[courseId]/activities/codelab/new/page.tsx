/**
 * Instructor CodeLab Template Editor
 * Route: /[institute]/courses/[courseId]/activities/codelab/new
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
  descriptionTemplate: z.string().min(1),
  variablesConfig: z.string().optional(),
  signatureConfig: z.string().min(1),
  publicTestCases: z.string().min(1),
  hiddenTestCases: z.string().optional(),
});

export default async function NewCodeLabActivityPage({
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

    const difficulty = formData.get("difficulty") as string;
    const descTemplate = formData.get("descriptionTemplate") as string;
    const varsConfig = formData.get("variablesConfig") as string;
    const sigConfig = formData.get("signatureConfig") as string;
    const publicTests = formData.get("publicTestCases") as string;
    const hiddenTests = formData.get("hiddenTestCases") as string;

    const parsed = createTemplateSchema.safeParse({
      courseId,
      difficulty: parseInt(difficulty, 10),
      descriptionTemplate: descTemplate,
      variablesConfig: varsConfig,
      signatureConfig: sigConfig,
      publicTestCases: publicTests,
      hiddenTestCases: hiddenTests,
    });

    if (!parsed.success) {
      throw new Error("Validation failed");
    }

    const { data } = parsed;

    // Parse JSON configurations to validate them before saving
    let parsedVars = [];
    let parsedSig = null;
    let parsedPublic = [];
    let parsedHidden = [];

    try {
      if (data.variablesConfig) parsedVars = JSON.parse(data.variablesConfig);
      parsedSig = JSON.parse(data.signatureConfig);
      parsedPublic = JSON.parse(data.publicTestCases);
      if (data.hiddenTestCases) parsedHidden = JSON.parse(data.hiddenTestCases);
    } catch (e) {
      throw new Error("Invalid JSON in one of the configuration fields.");
    }

    const template = await db.activityTemplate.create({
      data: {
        activityType: "codelab", 
        courseId: data.courseId,
        difficulty: data.difficulty,
        variables: JSON.stringify({
          descriptionTemplate: data.descriptionTemplate,
          variablesConfig: parsedVars,
          signatureConfig: parsedSig,
          publicTestCases: parsedPublic,
        }),
        hiddenTestCases: JSON.stringify(parsedHidden),
        createdBy: sessionInfo.user.id,
      },
    });

    revalidatePath(`/${institute}/courses/${courseId}`);
    redirect(`/${institute}/courses/${courseId}?createdTemplateId=${template.id}`);
  }

  const defaultDesc = `Write a function that returns the sum of an array of integers, but if the number is greater than {{MAX_VAL}}, ignore it.`;
  
  const defaultVars = `[
  { "name": "MAX_VAL", "type": "number", "min": 10, "max": 100 }
]`;

  const defaultSig = `{
  "name": "sumArray",
  "returnType": "int",
  "params": [
    { "name": "arr", "type": "int[]" }
  ]
}`;

  const defaultPublicTests = `[
  { "input": "5 10 150", "expectedOutput": "15" },
  { "input": "20 5", "expectedOutput": "25" }
]`;

  const defaultHiddenTests = `[
  { "input": "1 2 200", "expectedOutput": "3" },
  { "input": "0", "expectedOutput": "0" }
]`;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create CodeLab Assignment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure a multi-language programming assignment with auto-grading.
        </p>
      </div>

      <form action={createTemplate} className="space-y-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Assignment Basics</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="1" defaultChecked className="accent-indigo-600" />
              <span className="text-sm font-medium">Difficulty 1 (Beginner)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="2" className="accent-indigo-600" />
              <span className="text-sm font-medium">Difficulty 2 (Intermediate)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="3" className="accent-indigo-600" />
              <span className="text-sm font-medium">Difficulty 3 (Advanced)</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Description Template (Markdown)</h2>
          <p className="text-xs text-gray-500">Use <code>{`{{VARIABLE_NAME}}`}</code> to inject randomized variables.</p>
          <textarea 
            name="descriptionTemplate" 
            defaultValue={defaultDesc}
            rows={3}
            className="w-full font-mono text-sm p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Variables Config (JSON Array)</h2>
            <textarea 
              name="variablesConfig" 
              defaultValue={defaultVars}
              rows={6}
              className="w-full font-mono text-xs p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Function Signature (JSON Object)</h2>
            <textarea 
              name="signatureConfig" 
              defaultValue={defaultSig}
              rows={6}
              className="w-full font-mono text-xs p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Public Test Cases (JSON Array)</h2>
            <textarea 
              name="publicTestCases" 
              defaultValue={defaultPublicTests}
              rows={6}
              className="w-full font-mono text-xs p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Hidden Test Cases (JSON Array)</h2>
            <textarea 
              name="hiddenTestCases" 
              defaultValue={defaultHiddenTests}
              rows={6}
              className="w-full font-mono text-xs p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit"
            className="px-6 py-2.5 rounded-lg text-white font-medium transition-colors hover:opacity-90"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Create CodeLab Template
          </button>
        </div>
      </form>
    </div>
  );
}
