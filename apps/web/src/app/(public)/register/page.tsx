import RegisterForm from '@/components/forms/RegisterForm';
import { publicDisplay } from '@/lib/public-fonts';
import { googleEnabled, readGoogleProfile } from '@/lib/google-auth';
import { db } from '@/lib/db';
import {
  ITE_STUDENT_PROGRAM_CODES,
  inspectIteDatabasePrograms,
} from '@/lib/ite-programs/features';
import { supportedInstitute } from '@/lib/super-user-v1/capabilities';

export const dynamic = 'force-dynamic';

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ institute?: string; google?: string }>;
}) {
  const query = await searchParams;
  const profile = query.google === '1' ? await readGoogleProfile() : null;
  const existing = profile
    ? await db.user.findFirst({
        where: {
          email: { equals: profile.email, mode: 'insensitive' },
          role: 'STUDENT',
        },
        include: { institute: true },
      })
    : null;

  const rawItePrograms = await db.academicProgram.findMany({
    where: {
      institute: { code: 'ite' },
      isActive: true,
      code: { in: [...ITE_STUDENT_PROGRAM_CODES] },
    },
    select: {
      id: true,
      code: true,
      name: true,
      isActive: true,
    },
  });

  const { programs: itePrograms, missingCodes: missingItePrograms } =
    inspectIteDatabasePrograms(rawItePrograms);

  return (
    <div className={publicDisplay.variable}>
      <RegisterForm
        googleExpired={query.google === '1' && !profile}
        instituteCode={
          existing?.institute.code ||
          profile?.instituteCode ||
          supportedInstitute(query.institute) ||
          'ics'
        }
        googleEnabled={googleEnabled()}
        googleProfile={
          profile
            ? { email: profile.email, name: existing?.name || profile.name }
            : null
        }
        linking={Boolean(existing)}
        studentNumber={existing?.studentNumber || existing?.uniqueId || ''}
        itePrograms={itePrograms}
        missingItePrograms={missingItePrograms}
      />
    </div>
  );
}
