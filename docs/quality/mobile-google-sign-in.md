# Google sign-in in Expo

The login screen includes Continue with Google below password sign-in. It requires
the same institute selection and policy consent as the web login.

## Flow

1. The app checks `/api/auth/google/mobile?status=1` before opening the browser.
   A backend without this update produces an actionable message rather than a
   browser 404 or a generic connection error.
2. Expo Crypto generates a random verifier and independent state. Only the
   verifier's SHA-256 challenge enters the browser URL.
3. The system authentication browser opens the existing server Google OAuth
   flow. The existing Google code/PKCE exchange, nonce, verified email, account
   admission and institute checks remain in effect. Google sign-in is currently
   student-only, matching the web implementation.
4. Linked accounts continue directly. New Google users and existing accounts
   that need linking complete the existing web registration/linking form. Existing
   accounts must prove their LMS password before linking; email alone is insufficient.
5. A separate encrypted cookie binds the verified Google subject to the browser
   session. The completion endpoint rejects ordinary pre-existing browser sessions
   without that verification. It returns an encrypted two-minute handoff to the app.
6. The app validates the exact callback destination and state, then exchanges the
   handoff together with its in-memory verifier. The server atomically consumes
   the browser session and creates a fresh session after rechecking admission.
   Concurrent or repeated handoff redemptions fail.
7. The app verifies the new bearer with `/api/auth/me`, then uses the existing
   SecureStore session envelope and owner-scoped cache reset. Enrollment and return
   routing remain the same as password sign-in. Browser cancellation leaves the
   current login unchanged.

No raw session bearer or Google client secret enters the callback URL or app bundle.
Handoff responses are private/no-store and use a no-referrer policy. No database
migration is required.

## Deployment and device acceptance

Deploy the changed web backend before using the updated app. Reuse the existing
server-only GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and APP_BASE_URL. Google's
authorized HTTPS redirect remains APP_BASE_URL + `/api/auth/callback/google`;
Google does not redirect directly to the app scheme.

Built apps use `lumina-lms://oauth/google`. Development Expo Go callbacks under
the actual Metro host use `/--/oauth/google`; only known Expo hostnames and local
development hosts are admitted, and intercepted handoffs remain verifier-bound.
Expo's standard OAuth guidance recommends a development build rather than Expo Go
because Expo Go cannot customize its scheme. Validate this server-mediated return
on the exact Expo Go version/OS in use; production acceptance should use a
development/release build with the app's own scheme.

Automated checks cover callback validation, real JWE encryption/decryption,
expiration, incorrect proof, missing browser verification, atomic single use,
inactive/cross-institute accounts, and native session establishment. Browser
fixtures cover button visibility and policy consent. They do not perform real
Google consent or prove an OS browser-to-app return.

Before release, test on the phone: existing linked student, registration/password
linking, an unenrolled account, cancellation, wrong institute, expired handoff and
app restart during sign-in. Restarting the app discards the verifier intentionally;
the user must start Google sign-in again. No live Google account was used or
production deployment performed during implementation.

Reference: https://docs.expo.dev/guides/authentication/
