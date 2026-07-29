export function getApiBaseUrl(): string {
  // React Native / Expo
  if (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  // Next.js / Browser
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }

  // Server-side fallback
  return process.env.API_BASE_URL || 'http://localhost:3000';
}
