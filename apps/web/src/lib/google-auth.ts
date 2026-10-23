import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { createRemoteJWKSet, EncryptJWT, jwtDecrypt, jwtVerify } from 'jose';
import { z } from 'zod';

const COOKIE = 'lms_google_flow';
const PROFILE = 'lms_google_profile';
const profileSchema = z.object({ sub: z.string().min(1).max(255), email: z.string().email().max(254), name: z.string().max(150), instituteCode: z.enum(['ics', 'ite', 'ibe']) });
const flowSchema = z.object({ state: z.string().min(32), nonce: z.string().min(32), verifier: z.string().min(32), instituteCode: z.enum(['ics', 'ite', 'ibe']), acceptedPolicies: z.literal(true) });
const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const base = new URL(process.env.APP_BASE_URL || 'http://localhost:3000');
  if (!clientId || !clientSecret || base.pathname !== '/' || (base.protocol !== 'https:' && !(base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)))) throw new Error('Google sign-in configuration is unavailable.');
  return { clientId, clientSecret, origin: base.origin, redirectUri: base.origin + '/api/auth/callback/google' };
}
export function googleEnabled() {
  try { googleConfig(); return true; } catch { return false; }
}
function key() { return createHash('sha256').update('lms-google-flow-v1:' + googleConfig().clientSecret).digest(); }
async function save(name: string, data: Record<string, unknown>, purpose: string) {
  const token = await new EncryptJWT(data).setProtectedHeader({ alg: 'dir', enc: 'A256GCM' }).setIssuer('cdm-lms').setAudience(purpose).setIssuedAt().setExpirationTime('10m').encrypt(key());
  (await cookies()).set(name, token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 600 });
}
async function read(name: string, purpose: string) {
  const token = (await cookies()).get(name)?.value;
  if (!token) return null;
  try { return (await jwtDecrypt(token, key(), { issuer: 'cdm-lms', audience: purpose, keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'] })).payload; } catch { return null; }
}
export async function beginGoogle(instituteCode: 'ics' | 'ite' | 'ibe') {
  const config = googleConfig();
  const state = randomBytes(32).toString('base64url'), nonce = randomBytes(32).toString('base64url'), verifier = randomBytes(32).toString('base64url');
  await clearGoogleProfile();
  await save(COOKIE, { state, nonce, verifier, instituteCode, acceptedPolicies: true }, 'oauth');
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: 'openid email profile', state, nonce, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256', prompt: 'select_account' }).toString();
  return url;
}
export async function finishGoogle(url: URL) {
  const parsed = flowSchema.safeParse(await read(COOKIE, 'oauth'));
  (await cookies()).delete(COOKIE);
  if (!parsed.success || !url.searchParams.get('state') || url.searchParams.get('state') !== parsed.data.state || !url.searchParams.get('code') || url.searchParams.has('error')) throw new Error('Invalid OAuth response.');
  const flow = parsed.data, config = googleConfig();
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, cache: 'no-store', signal: AbortSignal.timeout(10000),
    body: new URLSearchParams({ code: url.searchParams.get('code')!, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code', code_verifier: flow.verifier }),
  });
  if (!response.ok) throw new Error('OAuth exchange failed.');
  const tokens = await response.json();
  const { payload } = await jwtVerify(tokens.id_token, jwks, { issuer: ['https://accounts.google.com', 'accounts.google.com'], audience: config.clientId, algorithms: ['RS256'], requiredClaims: ['sub', 'exp', 'iat', 'email', 'nonce'] });
  if (payload.nonce !== flow.nonce || payload.email_verified !== true) throw new Error('Unverified Google identity.');
  return profileSchema.parse({ sub: payload.sub, email: typeof payload.email === 'string' ? payload.email.toLowerCase() : '', name: typeof payload.name === 'string' ? payload.name : '', instituteCode: flow.instituteCode });
}
export async function saveGoogleProfile(profile: z.infer<typeof profileSchema>) { await save(PROFILE, profile, 'registration'); }
export async function readGoogleProfile() {
  const result = profileSchema.safeParse(await read(PROFILE, 'registration'));
  return result.success ? result.data : null;
}
export async function clearGoogleProfile() { (await cookies()).delete(PROFILE); }
