import { compare, hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { passwordSchema } from '@/lib/auth-schema';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { mayUsePublicReset } from '@/lib/super-user-v1/capabilities';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
const input = z.object({ email: z.string().email().max(254), otp: z.string().regex(/^\d{6}$/), newPassword: passwordSchema.max(72) }).strict();
const invalid = () => new AccessError(400, 'Invalid or expired reset.');

export async function POST(request: Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) throw invalid();
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() }, select: { id: true } });
    if (!user) throw invalid();
    const password = await hash(parsed.data.newPassword, 10);
    const accepted = await db.$transaction(async tx => {
      await lockAccounts(tx, [user.id]);
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || !mayUsePublicReset(current)) throw invalid();
      const grant = await tx.passwordResetOtp.findFirst({ where: { userId: user.id, isUsed: false }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (!grant || grant.expiresAt <= new Date()) return false;
      // A redemption attempt consumes the grant even when the guess is wrong.
      // Returning false (rather than throwing) commits the failed-attempt budget.
      // Together with the persisted issuance cap this bounds guesses without
      // adding another state store or an unapproved schema field.
      const consumed = await tx.passwordResetOtp.updateMany({ where: { id: grant.id, isUsed: false, expiresAt: { gt: new Date() } }, data: { isUsed: true } });
      if (consumed.count !== 1 || !await compare(parsed.data.otp, grant.otpCodeHash)) return false;
      await tx.user.update({ where: { id: user.id }, data: { password } });
      await tx.passwordResetOtp.updateMany({ where: { userId: user.id, isUsed: false }, data: { isUsed: true } });
      await tx.session.deleteMany({ where: { userId: user.id } });
      return true;
    });
    if (!accepted) throw invalid();
    return Response.json({ message: 'Password has been successfully reset.' });
  } catch (error) { return accountErrorResponse(error); }
}
