/**
 * Instructor Arduino Activity Template Editor
 * Route: /[institute]/courses/[courseId]/activities/arduino/new
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
  starterCode: z.string(),
});

export default async function NewArduinoActivityPage({
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
    const starterCode = formData.get("starterCode") as string;

    const parsed = createTemplateSchema.safeParse({
      courseId,
      difficulty: parseInt(difficulty, 10),
      faultPool: faults,
      starterCode,
    });

    if (!parsed.success) {
      throw new Error("Validation failed");
    }

    const { data } = parsed;

    const template = await db.activityTemplate.create({
      data: {
        activityType: "arduino", // Changed from Sprint 2
        courseId: data.courseId,
        difficulty: data.difficulty,
        faultPool: JSON.stringify(data.faultPool),
        variables: JSON.stringify({ starterCode: data.starterCode }),
        createdBy: sessionInfo.user.id,
      },
    });

    revalidatePath(`/${institute}/courses/${courseId}`);
    redirect(`/${institute}/courses/${courseId}?createdTemplateId=${template.id}`);
  }

  const availableFaults = [
    { id: "REVERSED_LED", label: "LED inserted backwards (anode to ground)" },
    { id: "MISSING_GND_WIRE", label: "Breadboard missing ground wire to Arduino" },
    { id: "WRONG_PIN_IN_CODE", label: "Code uses Pin 12, but LED is on Pin 13" },
  ];

  const defaultStarterCode = `void setup() {
  pinMode(13, OUTPUT);
  Serial.begin(9600);
}

void loop() {
  digitalWrite(13, HIGH);
  Serial.println("LED ON");
  delay(1000);
  digitalWrite(13, LOW);
  Serial.println("LED OFF");
  delay(1000);
}`;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">Create Arduino Assignment</h1>
        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-1">
          Configure a randomized IoT circuit assignment.
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
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] border-b border-slate-100 dark:border-white/5 pb-2">Eligible Faults Pool</h2>
          <div className="space-y-3">
            {availableFaults.map((fault) => (
              <label key={fault.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl border border-slate-200/60 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                <input type="checkbox" name="faultPool" value={fault.id} defaultChecked className="mt-1 accent-[#F97316]" />
                <div>
                  <span className="block text-xs font-semibold text-slate-900 dark:text-[#F0F2F8]">{fault.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8] border-b border-slate-100 dark:border-white/5 pb-2">Starter Code</h2>
          <textarea 
            name="starterCode" 
            defaultValue={defaultStarterCode}
            rows={12}
            className="w-full font-mono text-xs p-4 bg-slate-50/50 dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-xl text-slate-900 dark:text-[#F0F2F8] focus:border-orange-500 outline-none"
          />
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
