/**
 * Instructor Server Rack Activity Template Editor
 * Route: /[institute]/courses/[courseId]/activities/server-rack/new
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
  goalDescription: z.string(),
});

export default async function NewServerRackActivityPage({
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
    const goalDescription = formData.get("goalDescription") as string;

    const parsed = createTemplateSchema.safeParse({
      courseId,
      difficulty: parseInt(difficulty, 10),
      faultPool: faults,
      goalDescription,
    });

    if (!parsed.success) {
      throw new Error("Validation failed");
    }

    const { data } = parsed;

    const template = await db.activityTemplate.create({
      data: {
        activityType: "server-rack", 
        courseId: data.courseId,
        difficulty: data.difficulty,
        faultPool: JSON.stringify(data.faultPool),
        variables: JSON.stringify({ goalDescription: data.goalDescription }),
        createdBy: sessionInfo.user.id,
      },
    });

    revalidatePath(`/${institute}/courses/${courseId}`);
    redirect(`/${institute}/courses/${courseId}?createdTemplateId=${template.id}`);
  }

  const availableFaults = [
    { id: "WRONG_SUBNET_MASK", label: "Server pre-configured with incorrect subnet mask" },
    { id: "MISWIRED_T568A", label: "Uplink cable terminated as T568A instead of B (Simulation only)" },
  ];

  const defaultGoal = `1. Rack mount the Patch Panel, Switch, and both Servers.
2. Connect Server 1 and Server 2 to the Patch Panel, and patch them into the Switch using T568B cables.
3. Configure both servers to be on the 192.168.1.0/24 subnet.
4. Successfully ping Server 2 from Server 1.`;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Networking Assignment</h1>
        <p className="text-gray-500 text-sm mt-1">
          Configure a server rack patching and subnetting lab.
        </p>
      </div>

      <form action={createTemplate} className="space-y-8 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Difficulty</h2>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="1" defaultChecked className="accent-blue-600" />
              <span className="text-sm font-medium">Beginner (1 Fault)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="difficulty" value="2" className="accent-blue-600" />
              <span className="text-sm font-medium">Intermediate (2 Faults)</span>
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Eligible Faults Pool</h2>
          <div className="space-y-3">
            {availableFaults.map((fault) => (
              <label key={fault.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                <input type="checkbox" name="faultPool" value={fault.id} defaultChecked className="mt-1 accent-blue-600" />
                <div>
                  <span className="block text-sm font-medium text-gray-900">{fault.label}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-2">Goal Description</h2>
          <textarea 
            name="goalDescription" 
            defaultValue={defaultGoal}
            rows={5}
            className="w-full text-sm p-4 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
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
