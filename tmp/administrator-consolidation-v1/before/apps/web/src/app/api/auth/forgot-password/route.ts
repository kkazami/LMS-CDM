import { randomInt } from 'node:crypto';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendEmail } from '@/lib/mailer';
import { lockAccounts } from '@/lib/super-user-v1/account-lock';
import { mayUsePublicReset } from '@/lib/super-user-v1/capabilities';
import { AccessError, accountErrorResponse } from '@/lib/super-user-v1/actor';

export const dynamic = 'force-dynamic';
const input = z.object({ email: z.string().email().max(254) }).strict();
const generic = () => Response.json({ message: 'If that email exists, an OTP has been sent.' });

export async function POST(request: Request) {
  try {
    const parsed = input.safeParse(await request.json());
    if (!parsed.success) return Response.json({ message: 'Invalid request.' }, { status: 400 });
    const user = await db.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
    if (!user) return generic();
    const otp = randomInt(100000, 1000000).toString();
    const otpCodeHash = await hash(otp, 10);
    const pending = await db.$transaction(async tx => {
      await lockAccounts(tx, [user.id]);
      const current = await tx.user.findUnique({ where: { id: user.id } });
      if (!current || !mayUsePublicReset(current)) return null;
      const recent = await tx.passwordResetOtp.count({ where: { userId: user.id, createdAt: { gte: new Date(Date.now() - 3600000) } } });
      if (recent >= 3) throw new AccessError(429, 'Too many password reset requests. Please try again later.');
      await tx.passwordResetOtp.updateMany({ where: { userId: user.id, isUsed: false }, data: { isUsed: true } });
      const grant = await tx.passwordResetOtp.create({ data: { userId: user.id, otpCodeHash, isUsed: true, expiresAt: new Date(Date.now() + 900000) } });
      return { grant, email: current.email, password: current.password, role: current.role };
    });
    if (!pending) return generic();
    try {
      await sendEmail({ to: pending.email, subject: 'CdM LMS — Password reset', html: `<p>Your password reset code is <strong>${otp}</strong>. It expires in 15 minutes and permits one attempt. Request a new code after an unsuccessful attempt.</p>` });
    } catch {
      // Grant was never usable. Cleanup failure cannot activate it.
      await db.passwordResetOtp.deleteMany({ where: { id: pending.grant.id, isUsed: true } }).catch(() => {});
      return Response.json({ message: 'Unable to deliver a reset code.' }, { status: 502 });
    }
    await db.$transaction(async tx => {
      await lockAccounts(tx, [user.id]);
      const current = await tx.user.findUnique({ where: { id: user.id } });
      const latest = await tx.passwordResetOtp.findFirst({ where: { userId: user.id }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] });
      if (!current || !mayUsePublicReset(current) || current.email !== pending.email || current.password !== pending.password || current.role !== pending.role || latest?.id !== pending.grant.id || latest.expiresAt <= new Date()) {
        throw new AccessError(503, 'Reset issuance unavailable.');
      }
      await tx.passwordResetOtp.update({ where: { id: pending.grant.id }, data: { isUsed: false } });
    });
    return generic();
  } catch (error) { return accountErrorResponse(error); }
}
