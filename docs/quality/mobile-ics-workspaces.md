# ICS workspaces in Expo

ICS students and faculty can open CodeLab, Knowledge Exchange and Practical Labs
from the dashboard shortcuts and More menu. Each course also links to its labs;
lab-linked classwork opens the specific assignment instead of the file-submission form.

The native shell embeds the existing authenticated web workspaces. This preserves
their server authorization, code evaluation, discussion actions, evidence uploads,
autosave and submission workflows. The API is still in `apps/web`.

`GET /api/auth/mobile-session` accepts an existing bearer session in the Authorization
header, validates that explicit identity, and sets an HttpOnly session cookie before
redirecting to an allowlisted ICS workspace. Tokens never enter redirect URLs or
injected JavaScript. Destination pages retain role, institute and course checks.
The session response is private and cannot be cached. The native bridge checks the
sender origin before accepting close requests.

On phones, code uses a keyboard-friendly text editor; HTML/CSS offer separate edit
and preview views. Desktop Monaco remains available. The native toolbar supplies
navigation and safe areas, so duplicate web navigation is hidden. Lab steps use a
compact selector on phones and the existing sidebar on wide screens. Reduced-motion
settings disable workspace motion and reduce native navigation effects.

## Shipping requirements

- Deploy the web changes before distributing the mobile update: the native shell
  needs `/api/auth/mobile-session` and the advertised `hybridDrafts` capability.
  Older backends offer a web-portal continuation instead of opening an unsafe editor.
- Practical Labs require the existing guided-labs database migration and evidence
  scanning/storage configuration. The client does not bypass readiness checks or
  apply migrations. Commands in guided labs still run in the student's own lab environment.
- Code evaluation requires the existing managed Judge0-compatible provider configuration.
  The app has no local execution or simulated grading fallback.
- Expo's browser preview opens the normal web portal. In-app WebViews run on iOS and Android.

## Verification

Run `node --import tsx --test tests/mobile/ics-features.test.ts`, `pnpm test:labs`,
`pnpm --filter mobile typecheck`, and `pnpm --filter web exec tsc --noEmit`.
Export native bundles with `pnpm --filter mobile exec expo export --platform android --platform ios`.

Before shipping, verify on an iPhone and Android phone, plus a tablet: student and
faculty entry points; fresh/expired sessions; Python and HTML/CSS editing with the
keyboard open; forum posting and answering; lab step changes, autosave, evidence
upload and submission; Back/Done while saving; dark mode and reduced motion.
No simulator or connected device was available during this implementation, so
bundle compilation and automated tests do not establish gesture or visual correctness.

The student-focused implementation, monitoring/build prerequisites and final test
results are recorded in [ICS student mobile implementation](./ics-mobile-implementation.md).
