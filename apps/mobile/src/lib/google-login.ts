import * as Crypto from 'expo-crypto';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_BASE_URL } from './constants';
import { createApiClient, ApiClientError } from '@lms/api-client';
import { googleCallbackTicket } from './google-login-validation';

export async function startGoogleLogin(instituteCode: string, acceptedPolicies: boolean) {
  if (!acceptedPolicies) throw new Error('Agree to the Terms and Conditions and acknowledge the Privacy Policy to continue with Google.');
  if (Platform.OS === 'web') throw new Error('Use the iOS or Android app for mobile Google sign-in, or continue on the web portal.');
  try {
    const status = await createApiClient({ baseUrl: API_BASE_URL }).auth.googleAvailable();
    if (!status.available) throw new Error('Google sign-in is not configured yet. Please use your email or student ID.');
  } catch (error) {
    if (error instanceof ApiClientError && error.status === 404) throw new Error('Google sign-in needs the updated web portal. Please use your email or student ID for now.');
    throw error;
  }
  const random = async () => Array.from(await Crypto.getRandomBytesAsync(32), byte => byte.toString(16).padStart(2, '0')).join('');
  const verifier = await random(), state = await random();
  const challenge = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, verifier);
  const returnUri = Linking.createURL('oauth/google');
  const url = new URL('/api/auth/google/mobile', API_BASE_URL);
  url.search = new URLSearchParams({ instituteCode, acceptedPolicies: 'true', returnUri, challenge, state }).toString();
  const result = await WebBrowser.openAuthSessionAsync(url.toString(), returnUri);
  if (result.type !== 'success') return null;
  return { ticket: googleCallbackTicket(result.url, returnUri, state), verifier };
}
