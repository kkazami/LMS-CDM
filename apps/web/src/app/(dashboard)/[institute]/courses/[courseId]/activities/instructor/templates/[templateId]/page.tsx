import { db } from "@/lib/db";
import { getSession } from "@/lib/auth-session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export default async function TemplateEditorPage({
  params
}: {
  params: Promise<{ institute: string; courseId: string; templateId: string }>;
}) {
  const { institute, courseId, templateId } = await params;
  const isNew = templateId === "new";

  let template: any = null;
  if (!isNew) {
    template = await db.activityTemplate.findUnique({
      where: { id: templateId }
    });
    if (!template) {
      redirect(`/${institute}/courses/${courseId}/activities/instructor`);
    }
  }

  async function saveTemplate(formData: FormData) {
    "use server";
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const title = formData.get("title") as string;
    const activityType = formData.get("activityType") as string;
    const difficulty = parseInt(formData.get("difficulty") as string, 10);
    const variablesStr = formData.get("variables") as string;
    const faultPoolStr = formData.get("faultPool") as string;
    const hiddenTestCasesStr = formData.get("hiddenTestCases") as string;

    // Validate JSON
    try {
      if (variablesStr) JSON.parse(variablesStr);
      if (faultPoolStr) JSON.parse(faultPoolStr);
      if (hiddenTestCasesStr) JSON.parse(hiddenTestCasesStr);
    } catch (e) {
      throw new Error("Invalid JSON in configuration fields.");
    }

    if (isNew) {
      // 1. Create SyllabusItem
      const syllabusItem = await db.syllabusItem.create({
        data: {
          courseId,
          type: "ASSIGNMENT",
          title: `Interactive Activity: ${title}`,
          maxPoints: 100
        }
      });

      // 2. Create Template
      await db.activityTemplate.create({
        data: {
          title,
          activityType,
          courseId,
          syllabusItemId: syllabusItem.id,
          difficulty,
          variables: variablesStr || "{}",
          faultPool: faultPoolStr || "[]",
          hiddenTestCases: hiddenTestCasesStr || "[]",
          createdBy: session.user.id
        }
      });
    } else {
      await db.activityTemplate.update({
        where: { id: templateId },
        data: {
          title,
          activityType,
          difficulty,
          variables: variablesStr || "{}",
          faultPool: faultPoolStr || "[]",
          hiddenTestCases: hiddenTestCasesStr || "[]",
        }
      });

      // Refetch to avoid closure serialization issues with the outer template object
      const existingTemplate = await db.activityTemplate.findUnique({
        where: { id: templateId },
        select: { syllabusItemId: true }
      });

      // Optionally update the linked SyllabusItem title
      if (existingTemplate?.syllabusItemId) {
        await db.syllabusItem.update({
          where: { id: existingTemplate.syllabusItemId },
          data: { title: `Interactive Activity: ${title}` }
        });
      }
    }

    revalidatePath(`/${institute}/courses/${courseId}/activities/instructor`);
    redirect(`/${institute}/courses/${courseId}/activities/instructor`);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-[#F0F2F8]">{isNew ? "Create New Scenario" : "Edit Scenario"}</h2>
        <p className="text-xs text-slate-500 dark:text-[#8B92A5] mt-0.5">Define the problem variables, hidden test cases, or faults.</p>
      </div>

      <form action={saveTemplate} className="bg-white dark:bg-[#141721] p-6 rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-xs space-y-6">
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Title</label>
            <input 
              name="title" 
              defaultValue={template?.title || ""} 
              required
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500" 
            />
          </div>
          <div className="space-y-2">
            <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Activity Type</label>
            <select 
              name="activityType" 
              defaultValue={template?.activityType || "codelab"}
              className="w-full rounded-xl border border-slate-200 dark:border-[#3D4460] bg-white dark:bg-[#1E2132] px-3 py-2 text-xs font-medium text-slate-900 dark:text-[#F0F2F8] outline-none transition focus:border-orange-500"
            >
              <option value="codelab">CodeLab</option>
              <option value="pc-build">PC Build</option>
              <option value="arduino">Arduino</option>
              <option value="server-rack">Server Rack</option>
              <option value="logic-gate">Logic Gates</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Difficulty Level</label>
          <div className="flex gap-4">
            {[1, 2, 3].map(level => (
              <label key={level} className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-[#F0F2F8]">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value={level} 
                  defaultChecked={(template?.difficulty || 1) === level} 
                  className="accent-[#F97316]"
                />
                Level {level}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Variables (JSON Object)</label>
          <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">e.g., CodeLab variables or Arduino thresholds.</p>
          <textarea 
            name="variables" 
            defaultValue={template?.variables || "{}"}
            rows={5}
            className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-50/50 dark:bg-[#1E2132] p-3 text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Fault Pool (JSON Array)</label>
            <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">For 3D troubleshooting scenarios.</p>
            <textarea 
              name="faultPool" 
              defaultValue={template?.faultPool || "[]"}
              rows={5}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-50/50 dark:bg-[#1E2132] p-3 text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-xs text-slate-700 dark:text-[#F0F2F8]">Hidden Test Cases (JSON Array)</label>
            <p className="text-[11px] text-slate-400 dark:text-[#8B92A5]">For CodeLab grading.</p>
            <textarea 
              name="hiddenTestCases" 
              defaultValue={template?.hiddenTestCases || "[]"}
              rows={5}
              className="w-full font-mono text-xs rounded-xl border border-slate-200 dark:border-[#3D4460] bg-slate-50/50 dark:bg-[#1E2132] p-3 text-slate-900 dark:text-[#F0F2F8] outline-none transition placeholder:text-slate-400 focus:border-orange-500"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
          <button 
            type="submit" 
            className="bg-[#F97316] hover:bg-orange-600 text-white font-semibold text-xs py-2 px-6 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            Save Template
          </button>
        </div>
      </form>
    </div>
  );
}
