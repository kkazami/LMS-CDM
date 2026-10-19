import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
export default async function CreateTasksPage() {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/create-tasks/page.tsx");

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-[#F0F2F8]">Create Tasks</h2>
      <p className="text-sm text-slate-600 dark:text-[#8B92A5]">Create and assign tasks to your students.</p>
    </div>
  );
}
