import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
export default async function BackupPage() {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/backup/page.tsx");

  return (
    <div>
      <h2 className="text-2xl font-bold">Backup & Recovery</h2>
      <p className="mt-4 text-gray-600">Manage database backups and restore system data when needed.</p>
    </div>
  );
}
