import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
export default async function SecurityPage() {
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/security/page.tsx");

  return (
    <div>
      <h2 className="text-2xl font-bold">Security Tools</h2>
      <p className="mt-4 text-gray-600">Monitor security threats and manage institute-wide security settings.</p>
    </div>
  );
}
