import nodemailer from 'nodemailer';
export interface SendEmailOptions { to: string; subject: string; html: string; text?: string }
export interface SendEmailResult { success: boolean; deliveredVia: 'smtp'; messageId?: string }
export class MailDeliveryError extends Error {
  constructor(public readonly code: string, public readonly responseCode?: number) { super('Email delivery failed.'); }
}
export function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
function transport() {
  if (!smtpConfigured()) throw new MailDeliveryError('SMTP_NOT_CONFIGURED');
  const port = Number(process.env.SMTP_PORT || 587);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST, port, secure: process.env.SMTP_SECURE === 'true' || port === 465,
    requireTLS: port !== 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS!.replace(/\s+/g, '') },
    connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 8000, dnsTimeout: 5000,
    logger: false, debug: false,
  });
}
export async function verifySmtp() {
  const sender = transport();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([sender.verify(), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new MailDeliveryError('ETIMEDOUT')), 12000); })]); }
  finally { if (timer) clearTimeout(timer); sender.close(); }
}
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const sender = transport();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const info = await Promise.race([sender.sendMail({ ...options, from: process.env.SMTP_FROM || process.env.SMTP_USER, disableFileAccess: true, disableUrlAccess: true }), new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new MailDeliveryError('ETIMEDOUT')), 12000); })]);
    if (!info.accepted?.length) throw new MailDeliveryError('RECIPIENT_REJECTED', 550);
    return { success: true, deliveredVia: 'smtp', messageId: info.messageId };
  } catch (error) {
    if (error instanceof MailDeliveryError) throw error;
    const detail = error as { code?: string; responseCode?: number; response?: string };
    const quota = /5\.4\.5|(?:daily|sending|quota).{0,50}(?:limit|exceed)|(?:limit|quota).{0,50}(?:reach|exceed)/i.test(detail.response ?? '');
    throw new MailDeliveryError(quota ? 'SMTP_QUOTA' : /^[A-Z0-9_]+$/.test(detail.code ?? '') ? detail.code! : 'SMTP_ERROR', detail.responseCode);
  } finally { if (timer) clearTimeout(timer); sender.close(); }
}
