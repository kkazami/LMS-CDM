/**
 * Instructor PC Build Activity Template Editor
 * Route: /[institute]/courses/[courseId]/activities/pc-build/new
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
});

export default async function NewPCBuildActivityPage({
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

  // Server Action to create the template
  async function createTemplate(formData: FormData) {
    "use strict";
    "use server";
    const sessionInfo = await getSession();
    if (!sessionInfo) throw new Error("Unauthorized");

    const faults = formData.getAll("faultPool") as string[];
    const difficulty = formData.get("difficulty") as string;

    const parsed = createTemplateSchema.safeParse({
      courseId,
      difficulty: parseInt(difficulty, 10),
      faultPool: faults,
    });

    if (!parsed.success) {
      throw new Error("Validation failed");
    }

    const { data } = parsed;

    // Create the template in the database
    const template = await db.activityTemplate.create({
      data: {
        activityType: "pc-build",
        courseId: data.courseId,
        difficulty: data.difficulty,
        faultPool: JSON.stringify(data.faultPool),
        variables: JSON.stringify({}),
        createdBy: sessionInfo.user.id,
      },
    });

    // In a real flow, this would attach to a classwork/syllabus item.
    // For Sprint 2, we just create the template and redirect back to the course.
    revalidatePath(`/${institute}/courses/${courseId}`);
    redirect(`/${institute}/courses/${courseId}?createdTemplateId=${template.id}`);
  }

  const availableFaults = [
    { id: "RAM_WRONG_SLOT", label: "RAM installed in wrong slots (Not A2/B2)" },
    { id: "CPU_POWER_UNPLUGGED", label: "8-pin CPU power cable unplugged" },
    { id: "GPU_NOT_SEATED", label: "GPU physically unseated" },
    { id: "NO_THERMAL_PASTE", label: "Missing thermal paste" },
    { id: "PSU_UNPLUGGED", label: "24-pin motherboard power unplugged" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Create PC Build Assignment</h1>
        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
          Configure a randomized troubleshooting assignment.
        </p>
      </div>

      <form action={createTemplate} className="space-y-8 bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs">
        
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] border-b border-slate-100 dark:border-white/5 pb-2">Difficulty</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="1" defaultChecked className="accent-[#F97316]" />
              <span className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Beginner (1 Fault)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="2" className="accent-[#F97316]" />
              <span className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Intermediate (2 Faults)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="3" className="accent-[#F97316]" />
              <span className="text-xs font-semibold text-slate-700 dark:text-[#F0F2F8]">Advanced (3 Faults)</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] border-b border-slate-100 dark:border-white/5 pb-2">Eligible Faults Pool</h2>
          <p className="text-xs text-slate-500 dark:text-[#8B92A5]">
            Select the faults that the system can randomly inject. The system will pick up to [Difficulty] faults from this pool per student.
          </p>
          <div className="space-y-3">
            {availableFaults.map((fault) => (
              <label key={fault.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <input 
                  type="checkbox" 
                  name="faultPool" 
                  value={fault.id} 
                  defaultChecked
                  className="mt-1 accent-[#F97316]"
                />
                <div>
                  <span className="block text-xs font-semibold text-slate-900 dark:text-[#F0F2F8]">{fault.label}</span>
                  <span className="block text-[10px] text-slate-400 dark:text-[#8B92A5] font-mono mt-0.5">{fault.id}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button 
            type="submit"
            className="px-6 py-2.5 rounded-xl text-white text-xs font-semibold transition-colors cursor-pointer shadow-xs"
            style={{ backgroundColor: theme.colors.primary }}
          >
            Create Assignment Template
          </button>
        </div>
      </form>
    </div>
  );
}
