import { requireLegacyActor } from '@/lib/super-user-v1/legacy-entry-guard';
export default async function Page(){
  await requireLegacyActor("apps/web/src/app/(dashboard)/[institute]/parents/page.tsx");
return <div>Parents</div>}
