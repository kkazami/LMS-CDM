import { createHash } from 'node:crypto';
import { cookies } from 'next/headers';
import { EncryptJWT, jwtDecrypt } from 'jose';
import { z } from 'zod';
import { googleConfig } from './google-auth';

const FLOW = 'lms_google_mobile';
const READY = 'lms_google_mobile_ready';
export const mobileGoogleFlowSchema = z.object({
  instituteCode: z.enum(['ics', 'ite', 'ibe']),
  challenge: z.string().regex(/^[a-f0-9]{64}$/),
  state: z.string().regex(/^[a-f0-9]{64}$/),
  returnUri: z.string().max(2048).refine(validGoogleReturnUri),
});
export function validGoogleReturnUri(value: string) {
  try {
    const url = new URL(value);
    if (url.username || url.password || url.search || url.hash) return false;
    if (url.protocol === 'lumina-lms:') return url.hostname === 'oauth' && url.pathname === '/google' || url.hostname === '' && url.pathname === '/oauth/google';
    // Expo Go receives only an encrypted handoff; redemption requires the app's verifier.
    if (!['exp:', 'exps:'].includes(url.protocol) || url.pathname !== '/--/oauth/google') return false;
    return /(?:^|\.)(?:exp\.direct|expo\.dev)$/.test(url.hostname) || ['localhost', '127.0.0.1', '10.0.2.2'].includes(url.hostname) || /^(?:10\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.)/.test(url.hostname);
  } catch { return false; }
}
const key = () => createHash('sha256').update('lms-google-mobile-v1:' + googleConfig().clientSecret).digest();
export async function sealGoogleMobile(data: Record<string, unknown>, purpose: string, lifetime = '2m') {
  return new EncryptJWT(data).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setIssuer('cdm-lms').setAudience(purpose).setIssuedAt().setExpirationTime(lifetime).encrypt(key());
}
export async function openGoogleMobile(token: string, purpose: string) {
  return (await jwtDecrypt(token, key(), { issuer: 'cdm-lms', audience: purpose, keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] })).payload;
}
async function save(name: string, token: string, maxAge: number) {
  (await cookies()).set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge });
}
export async function saveGoogleMobileFlow(flow: z.infer<typeof mobileGoogleFlowSchema>) {
  await clearGoogleMobile();
  await save(FLOW, await sealGoogleMobile(flow, 'mobile-flow', '10m'), 600);
}
export async function readGoogleMobileFlow() {
  try {
    const token = (await cookies()).get(FLOW)?.value;
    const result = mobileGoogleFlowSchema.safeParse(token ? await openGoogleMobile(token, 'mobile-flow') : null);
    return result.success ? result.data : null;
  } catch { return null; }
}
export async function prepareGoogleMobile(sessionId: string, sub: string) {
  const flow = await readGoogleMobileFlow();
  if (!flow) return false;
  await save(READY, await sealGoogleMobile({ sessionId, sub, state: flow.state }, 'mobile-ready'), 120);
  return true;
}
export async function readGoogleMobileReady() {
  try { const token = (await cookies()).get(READY)?.value; return token ? await openGoogleMobile(token, 'mobile-ready') : null; }
  catch { return null; }
}
export async function clearGoogleMobile() { const jar = await cookies(); jar.delete(FLOW); jar.delete(READY); }
export const googleMobileHeaders = { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' };
export function googleMobileReturn(flow: z.infer<typeof mobileGoogleFlowSchema>, params: Record<string, string>) {
  const url = new URL(flow.returnUri);
  url.search = new URLSearchParams({ ...params, state: flow.state }).toString();
  return new Response(null, { status: 303, headers: { ...googleMobileHeaders, Location: url.toString() } });
}
export const googleMobileVerifierHash = (value: string) => createHash('sha256').update(value).digest('hex');
