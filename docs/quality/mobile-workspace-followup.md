# Mobile workspace follow-up — 4 November 2026

**Current course correction:** [Checkpoint restoration](course-checkpoint-restoration.md) is authoritative: left-thumbnail cards from the user's original fourth screenshot and course styles from the named 39-test handoff. Both the standalone banner rewrite and later older-Git restoration are superseded.

**Course appearance superseded:** [The later user-requested restoration](course-layout-restoration.md) restores the original My Courses cards and course interiors, keeping instructor shared-image customization and the earlier font request. The full-width standalone card-banner redesign described in the original evidence below is withdrawn.

Scope: the four Android screenshots supplied by Kirby, plus the requested Ohmward integration. The original ICS presentation flag remains off by default. These functional repairs also work with the existing ICS presentation.

## Implemented behavior

- CodeLab exposes **Enter full screen / Exit full screen**. The same editor stays mounted, preserving code, selection and draft state. Fullscreen follows the visual viewport when the keyboard opens. Escape and Android Back exit fullscreen first; ordinary Back/Done retains the unsaved-work confirmation. The native header hides without remounting the WebView.
- Theme changes paint immediately. Removed the full-screen PNG capture, image-load wait and 600 ms JavaScript SVG reveal. Preference writes remain ordered during rapid toggles. Embedded workspaces synchronize theme context and skip web view-transition snapshots inside Expo.
- Knowledge Exchange has a single aligned scrollable navigation row, contained filter scrolling, labeled sorting and selected filter states, horizontal detail voting, compact wrapping author actions, readable comment bubbles with reachable options, and responsive anonymous-post settings and editor footer. The embedded dashboard responds to the native-ready event to remove duplicate web chrome and floating widgets.
- Removed Switch Account from the tools sheet and the combined legacy sign-out label. Sign out remains available, including its existing v2 confirmation.
- Course covers use full-width banners so artwork is visible. Relative preset URLs, existing data photos and authenticated private assets are supported. Bearer credentials are attached only to private assets on the configured portal origin. Instructors can choose one of the same five web banners, upload a photo or remove the cover. The editor explains that the shared cover appears in both apps, handles cancel/error/loading, and prevents late picker/upload results from crossing account sessions.
- Photo transport supplies native Expo `File` parts and browser blobs to the shared SDK, retaining filename/MIME and the original upload identity. This also repairs the instructor's existing shared-client file upload path under Expo 57's global fetch. Student progress/cancellation uploads retain their separate XMLHttpRequest transport. Picker/save errors remain visible above the sticky actions.
- Ohmward is available in student and instructor dashboards and tools menus, through authenticated in-app workspaces. It uses existing web lessons, progress, sandbox, instructor analytics and access checks. Added the real Ohmward paths to the session-bootstrap allowlist; unrelated destinations remain rejected. Phone controls, content sizing, editor inputs and circuit-canvas scrolling receive embedded-layout rules.

## Backend boundary

The later cover-customization request authorizes a narrow exception to the original presentation-only scope: `PATCH /api/courses/[courseId]` writes the existing `Course.coverImage` field. It uses the legacy-entry guard, the current authenticated actor, real teaching/course ownership checks, owned-upload checks and image MIME validation. It accepts the five existing preset banners, an owned private image or removal; arbitrary remote URLs and submitted actor identities confer no authority. No schema, auth protocol or Ohmward API changes are introduced.

The web changes must be deployed to the backend used by Expo for the embedded layout repairs, Ohmward bootstrap and cover-saving endpoint to become available there. Local Expo refresh alone does not publish the web portal. No deployment was performed.

## Verification

Automated evidence uses synthetic data and isolated browser fixtures; it does not modify production accounts.

- Mobile and web TypeScript checks.
- Mobile Node suite, including immediate/rapid theme updates, private-image credential boundaries, Ohmward allowlisting and course-cover authorization/input rejection.
- CodeLab browser layout suite: existing desktop resizing/mobile tabs plus fullscreen at 320, 390 and 768 px; verifies unchanged editor DOM/code and native Back messages.
- Embedded browser matrix: Knowledge Exchange feed/detail and real Ohmward primer at 320, 390 and 768 px in both themes; verifies no page overflow, aligned navigation, filter state and primer completion navigation. Initial Ohmward captures are separate from interaction-state captures. These are browser captures, not native screenshots.
- Expo preview journeys: existing student/professor flows, mounted ICS-to-IBE logout/login, Ohmward route/menu, cover preset selection/save and updated course data.
- Expo web, Android and iOS JavaScript/Hermes exports.

Final local results: **45 mobile Node tests passed**, mobile/web TypeScript checks passed, web production build passed. The final browser/export results and native review disposition are recorded in [the reconciliation checklist](mobile-plan-reconciliation.md).

Actual Android debug APK built successfully using local SDK CMake 3.31.6/Ninja 1.12.1, supplied through a process-only Gradle property. Both roles' dashboard/tab/tools captures at 320dp in light/dark and instructor tablet captures at 768dp are under `tmp/mobile-native-review`. Native synthetic checks exercised CodeLab fullscreen with Gboard and draft-preserving Android Back; Knowledge Exchange feed/detail/history; Ohmward primer; sign-out; instructor preset save; OS photo selection/cropping; photo upload/save and authenticated private image loading. The fixture confirmed the selected bytes/MIME and an authorized private-image GET. These checks exercise real Expo components/Android WebView but use synthetic backend responses; they do not establish live authenticated database acceptance.

Changing emulator density while the process remained alive reproduced Expo's unregistered image-picker launcher issue. A cold app restart restored picking. The editor recognizes that failure and provides visible close/reopen recovery copy. No upstream dependency was patched. See [Expo's lifecycle issue](https://github.com/expo/expo/issues/41252) and [documented File/FormData upload](https://docs.expo.dev/versions/latest/sdk/filesystem/).

Read-only live checks passed homepage/login/health; anonymous protected mobile routes rejected access. Live course OPTIONS still allows only GET/HEAD/OPTIONS: the new PATCH and embedded changes have **not been deployed**. Database checks confirmed the existing cover/asset/Ohmward structures and application privileges. Ohmward deployment readiness remains false because of historical Arena migration checksum drift and a pending six-table removal; see [the separate review plan](quiz-arena-database-cleanup-plan.md). No live records or schema were changed.

## Device acceptance still required

Android emulator execution closes the former build blocker, but physical-device and iPhone acceptance is still required. Verify photo permission denial/cancellation, upload interruption, screen readers, large text, reduced motion, Ohmward circuit dragging/pin selection and frame pacing on the reference Android device and an iPhone. Complete authenticated end-to-end checks against an isolated deployed backend with synthetic accounts, including real asset scanning/storage. Existing physical performance and rollout gates in `ics-mobile-ui-overhaul.md` remain in force. A pre-existing shared login placeholder wraps at 320dp; sign-in remains functional, and shared auth layout work is recorded separately rather than silently expanding the ICS design scope.
