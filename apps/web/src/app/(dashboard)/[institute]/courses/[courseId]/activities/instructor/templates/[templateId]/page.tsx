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
        <h2 className="text-2xl font-bold text-gray-900">{isNew ? "Create New Scenario" : "Edit Scenario"}</h2>
        <p className="text-gray-500">Define the problem variables, hidden test cases, or faults.</p>
      </div>

      <form action={saveTemplate} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
        
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-semibold text-sm">Title</label>
            <input 
              name="title" 
              defaultValue={template?.title || ""} 
              required
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none" 
            />
          </div>
          <div className="space-y-2">
            <label className="font-semibold text-sm">Activity Type</label>
            <select 
              name="activityType" 
              defaultValue={template?.activityType || "codelab"}
              className="w-full border border-gray-300 rounded p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
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
          <label className="font-semibold text-sm">Difficulty Level</label>
          <div className="flex gap-4">
            {[1, 2, 3].map(level => (
              <label key={level} className="flex items-center gap-2">
                <input 
                  type="radio" 
                  name="difficulty" 
                  value={level} 
                  defaultChecked={(template?.difficulty || 1) === level} 
                  className="accent-indigo-600"
                />
                Level {level}
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="font-semibold text-sm">Variables (JSON Object)</label>
          <p className="text-xs text-gray-500">e.g., CodeLab variables or Arduino thresholds.</p>
          <textarea 
            name="variables" 
            defaultValue={template?.variables || "{}"}
            rows={5}
            className="w-full font-mono text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="font-semibold text-sm">Fault Pool (JSON Array)</label>
            <p className="text-xs text-gray-500">For 3D troubleshooting scenarios.</p>
            <textarea 
              name="faultPool" 
              defaultValue={template?.faultPool || "[]"}
              rows={5}
              className="w-full font-mono text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="font-semibold text-sm">Hidden Test Cases (JSON Array)</label>
            <p className="text-xs text-gray-500">For CodeLab grading.</p>
            <textarea 
              name="hiddenTestCases" 
              defaultValue={template?.hiddenTestCases || "[]"}
              rows={5}
              className="w-full font-mono text-sm border border-gray-300 rounded p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-100">
          <button 
            type="submit" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Save Template
          </button>
        </div>
      </form>
    </div>
  );
}
