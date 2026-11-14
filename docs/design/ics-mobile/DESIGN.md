---
name: CdM LMS — ICS native presentation
description: A calmer authenticated learning space for ICS students and professors.
colors:
  brand-light: "#FF7517"
  brand-dark: "#FF8A3D"
  accent-ink-light: "#B84400"
  accent-ink-dark: "#FFAE79"
  accent-tint-light: "#FFF0E5"
  accent-tint-dark: "#382419"
  canvas-light: "#F7F8FA"
  canvas-dark: "#0F1117"
  surface-light: "#FFFFFF"
  surface-dark: "#1A1E29"
  secondary-surface-light: "#F9FAFB"
  secondary-surface-dark: "#242938"
  text-light: "#0F172A"
  text-dark: "#F9FAFB"
  secondary-text-light: "#52627A"
  secondary-text-dark: "#9CA3AF"
  border-light: "#E2E8F0"
  border-dark: "#2E3547"
  on-brand: "#111827"
  ohmward-on-brand: "#17202B"
  danger-light: "#B42318"
  danger-dark: "#FCA5A5"
typography:
  display:
    fontFamily: "DMSerifDisplay-Regular"
    fontSize: "32"
    fontWeight: 400
    lineHeight: 39
    letterSpacing: "-0.6"
  headline:
    fontFamily: "Manrope-Bold"
    fontSize: "18"
    fontWeight: 700
    lineHeight: 26
  title:
    fontFamily: "Manrope-Bold"
    fontSize: "16"
    fontWeight: 700
    lineHeight: 24
  body:
    fontFamily: "Manrope-Regular"
    fontSize: "13"
    fontWeight: 400
    lineHeight: 21
  label:
    fontFamily: "Manrope-SemiBold"
    fontSize: "14"
    fontWeight: 600
    lineHeight: 22
rounded:
  icon-tile: "14"
  control: "16"
  group: "18"
  shortcut: "20"
  card: "22"
  tab-bar: "24"
  sheet: "28"
  pill: "999"
spacing:
  xs: "4"
  sm: "8"
  md: "12"
  lg: "16"
  gutter: "20"
  xl: "24"
  xxl: "32"
components:
  button-primary-light:
    backgroundColor: "{colors.brand-light}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.pill}"
    padding: "12 20"
  button-primary-dark:
    backgroundColor: "{colors.brand-dark}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.pill}"
    padding: "12 20"
  input-field:
    rounded: "{rounded.control}"
    padding: "12 16"
  card-container:
    rounded: "{rounded.card}"
    padding: "16"
---

# Design System: ICS native presentation

## Overview

**Creative North Star: "A calmer learning space"**

Source-derived specification for the ICS Expo / React Native presentation and its later authorized mobile workspace follow-up, governed by [BRIEF.md](BRIEF.md). Native lengths here are React Native logical units (points on iOS, density-independent units on Android); embedded web measurements are explicitly labeled CSS pixels. Native type follows font scaling. This document extends the shared [root DESIGN.md](../../../DESIGN.md) within this native and embedded scope. Orange primary fills and the serif welcome are intentional local exceptions to the shared web action and display rules.

**Key Characteristics:**

- Manrope interface type with one welcoming serif moment.
- Orange identity, readable accent ink, and quiet light/dark surfaces.
- Pending academic work before courses, tools, and calendar.
- Soft cards, comfortable controls, and restrained motion.

`EXPO_PUBLIC_ICS_UI_V2` opts in only when its value is exactly `true`; absent/false retains the default shared presentation. `selectMobilePresentation` additionally requires completed auth hydration, an authenticated session with a token, an ICS identity, and STUDENT in the student subtree or PROFESSOR/TEACHER in the teacher subtree. This is presentation selection, not authorization. Account identity and scope epoch key the subtree so presentation state is discarded on account changes. Course interiors participate in this same context; the mistaken course-route exclusion is removed. Both course index screens apply recovered checkpoint styles through `useIcsStyles`, and shared Card, Button, AppHeader and modal behavior again follows the ordinary eligible presentation. The confirmed course card uses its explicit thumbnail layout in both presentations.

**The Confirmed Course Checkpoint Rule.** The latest user clarification selects the original fourth screenshot for My Courses cards and the exact first-phase implementation handoff for interiors: Manrope/DM Serif, 39 tests, CMake/Ninja failure and flag off. Those historical outcomes identify the checkpoint, not today's validation. The intervening restoration to old Git geometry and its route exclusion were mistaken and are superseded. Preserve the confirmed thumbnail card, the recovered `icsStyles` objects, and instructor image customization.

The 4 November follow-up repairs workspaces, adds instructor cover customization and exposes existing Ohmward. Those additions work with the existing ICS presentation and do not redefine the visual flag. Its initial shared-only cover editor wrote existing `Course.coverImage`; the later independent-mobile-image amendment adds nullable `Course.mobileCoverImage` without changing auth. The user-authorized additive migration is applied and recorded; backend deployment and live feature acceptance remain pending. No unrelated migration or deployment was performed.

Earlier Android emulator captures and interaction checkpoints in `tmp/mobile-native-review` are historical. The APK built after local SDK CMake 3.31.6 / Ninja 1.12.1 installation and a process-only Gradle property, without a shipped native source/dependency build repair. Fixture-backed journeys exercised dashboards/tools, CodeLab/Gboard/Back, Knowledge Exchange, Ohmward, Sign out and OS photo upload. They do not establish acceptance of this latest checkpoint restoration. The intervening `tmp/course-restored-review` old-Git direction, reviewer disposition and 46-test/route-exclusion claims are also superseded.

For the latest checkpoint restoration, final mobile TypeScript, all 45 mobile tests, Expo Web export and the full synthetic student/professor journey passed after the press-feedback/professor-control correction. The independent checkpoint reviewer returned **ship** for source and all six supplementary captures in `tmp/course-checkpoint-review`, with documentation fixes resolved. Results are recorded in [course-checkpoint-restoration.md](../../quality/course-checkpoint-restoration.md). At baseline acceptance, the public Android bundle was verified `checkpointEnabled: true` through inspected Expo 57 descriptor injection, with four matching baseline source files. On 5 November, Kirby confirmed in Expo Go: Cards and course interior are correct. This is the accepted course visual baseline; broader release checks remain separate. The approved Expo/ngrok preview uses ignored `.env.development.local` only; code/example/production defaults remain false. Earlier all-platform exports and web build results are historical, recorded in [mobile-workspace-followup.md](../../quality/mobile-workspace-followup.md) and the [implementation reconciliation](../../quality/mobile-plan-reconciliation.md). iPhone, physical performance, screen-reader, live authenticated backend, remaining tablet coverage, large text, interruption/permission paths, activity recreation, circuit interactions and release acceptance remain **pending**. That baseline checkpoint added no database changes, deployment, new concepts or raster assets.

## Colors

**The Fill and Ink Rule.** Brand orange is a fill or indicator; small accent text uses the separate light/dark accent ink. `ui/Text.tsx` remaps raw ICS orange foregrounds in the eligible presentation, including course content. Explicit accent ink is used by dashboard, course-card links, header and tools components. Do not assume every native icon inherits this adapter.

Canvas, card, and secondary surface create hierarchy without decorative color blocks. Primary text carries titles; secondary text carries summaries, instructors, and descriptions. Primary buttons use `getOnPrimaryColor`, which selects dark ink for both ICS orange fills. Semantic success, warning, danger, and information colors remain meaningful and paired with words; inspect actual foreground/background pairs rather than treating the palette alone as a contrast pass.

Embedded Ohmward resolves action fills from the institute accent and uses its own dark on-brand ink. Theme state paints immediately in native views; ordered preference writes preserve the latest toggle across launches. Native-ready events synchronize the embedded web theme context. The native ThemeReveal snapshot overlay is removed, and embedded Expo pages skip web view-transition snapshots.

## Typography

Local static font assets register Manrope Regular (400), Medium (500), SemiBold (600), Bold (700), and ExtraBold (800), plus DM Serif Display Regular (400). The scoped Text adapter selects the explicit static family, resets synthetic weight, preserves explicit families such as code fonts, and propagates typography through nested Text. TextInput uses Manrope Regular. Loading failure retains usable system type. Provenance and OFL licenses are in `apps/mobile/assets/fonts/README.md` and the adjacent license files.

The welcome uses the display role while font scale is at most 1.3. Above 1.3 it becomes a Manrope greeting (21 / 29), removes the decorative student subline, and allows system scaling. The 1.3 cap belongs only to the serif welcome. Coursework and controls retain scaling behavior. Other observed roles include course metadata (12 / 19), detail copy (13 / 20), task titles (15 / 23), and tools heading (21 / 29); these local roles do not establish a universal 13-point minimum. V2 tab labels are a separate compact-navigation exception: one line, 11-unit type below width 360 and 12 otherwise, line-height 16, fit scale at least 0.85, and font-scale cap 1.2. The 320-dp emulator checkpoint covers this correction; large-text acceptance is still pending.

## Layout

Dashboard content is a single virtualized course list with a centered maximum width of 760, horizontal gutters of 20, top padding of 12, and bottom clearance from the existing tab/safe-area helper. Its header holds notices, welcome, real summary, student pending assignments or professor grading/enrollment queues, then the course heading. Its footer holds tools and calendar. Courses do not receive individual entrance animations.

The compact institutional header includes appearance, notifications, and account/tools controls; status-bar padding follows safe-area insets. Preserve five role-specific destinations: students have Dashboard, Courses, Grades, Alerts, More; professors have Dashboard, Classes, Analytics, Alerts, More. Tabs include selected accessibility state, stronger selected text, and an underline, with bottom safe-area padding.

The tools sheet is centered with a maximum width of 640 and bounded by viewport height minus the top inset and 20. Its body scrolls; profile content wraps, and the appearance switch occupies at least 48 × 48. Course-card footer groups wrap with 8-unit gaps and 48-unit links/reorder controls. Earlier professor 768-dp Android emulator evidence is historical; 768-point iPad, the specified 800-dp Android target, and current tablet acceptance remain pending.

Both course index screens use the exact first-phase `icsStyles` object literals recovered from `tmp/ics-ui-final/_expo/static/js/web/entry-0240d0fe9a97e760a6bfbb4f5bcb54b6.js`. `tmp/restore-39-test-course-styles.cjs` performs the extraction; `tmp/course-checkpoint-restoration.json` records the source and keys. Student overrides include 22-radius cards/groups, filter-scroll `flexGrow: 0` / `flexShrink: 0`, control/title roles, and a centered 900-unit content maximum. Professor overrides include 22-radius cards/modals, control/action and title roles. Professor inline tabs now explicitly preserve a 48-unit v2 minimum and the back control is 48 × 48 in v2, retaining legacy dimensions when disabled; the earlier conflicting inline minimum is resolved. Shared course headers receive the eligible wrapping behavior rather than the old truncated-header mode.

The user accepted that card/interior baseline in Expo Go, then authorized three local repairs. The ICS student course header now uses safe-area padding and a Back control beside a remaining-width text column: code/section (11 / 16), full title (18 / 24), instructor (12 / 18). It removes the right-chip competition for title width; Back is 48 × 48 with v2 enabled and retains the shared helper's 44-unit default when disabled. This is course-specific; other institutes keep their AppHeader fallback and the global component is unchanged. The top Practical Labs action is removed from both role course pages; existing tools/routes and classwork destinations remain. Thumbnail cards and accepted classwork geometry are unchanged.

For this amendment, mobile TypeScript, the parser-parity/security test, diff check and full exported synthetic student/professor preview pass. Six light/dark stream states at 320 / 390 / 768 verify a header below 140 CSS pixels in fixtures, no page overflow/top Labs action, one valid-post Meet button, and its destination through a stubbed opener. Browser evidence is in `tmp/course-meet-header-review`. The public Android bundle matches six current files with the checkpoint flag enabled. Fresh finish review returned **ship** for source and supplementary previews with no material fixes, recorded in [course-stream-header-meet.md](../../quality/course-stream-header-meet.md). Current amendment phone appearance and native OS launch remain unconfirmed; no actual meeting was joined.

Embedded Knowledge Exchange uses one aligned horizontally scrollable navigation row, contained filter scrolling, wrapping card/detail actions, horizontal detail voting, readable comment bubbles with reachable options, and responsive anonymous settings/editor footers. Sorting is labeled, filters announce selection, and embedded buttons/selects have 48 CSS-pixel minimum width and height. Native-ready handling removes duplicate web chrome and floating widgets. Ohmward keeps real lessons and workspaces, with phone-sized controls, 16 CSS-pixel embedded form text, bounded content, and contained circuit-canvas scrolling. These specific embedded rules do not define a new global web layout system.

At viewport heights up to 600 CSS pixels, non-fullscreen CodeLab scrolls vertically; its panels retain a 240 CSS-pixel minimum height and do not flex-shrink. This keeps results reachable below the toolbar at short landscape sizes such as 667 × 375. Fullscreen rules remain unchanged.

## Elevation & Depth

Tonal layering does most of the work. The active shared Card override removes the outer border, uses elevation 1, and retains only a small light-mode shadow (opacity 0.035; dark 0, offset 0 / 2, radius 6). Eligible course content again shares this presentation. `IcsCourseCard` is a soft 22-radius surface without a visible outer border; its footer retains a hairline separator. The tools modal uses a dim backdrop.

`SurfacePressable` scales to 0.98 over 120 ms and returns over 120 ms. The welcome enters over 220 ms with a 6-unit translation. Reduced motion removes the press scale and welcome entrance; tools use an instant modal instead of slide. Common Button still uses opacity feedback. Preserve native navigation transitions and existing unsaved-work guards.

## Shapes

Eligible surfaces use the card/control radii and pill buttons from the frontmatter. The confirmed course card has soft 22-unit outer corners and a left 58 × 64 image with 16-unit corners. The course code/title sit to its right; metadata and links follow below. Its source is `mobileCoverImage || coverImage`; geometry is unchanged. The gradient/BookOpen fallback occupies the same thumbnail. Preset SVGs use contain sizing; uploaded photos use cover sizing. There is no top banner or overlaid white title. The 3.2-aspect `CourseCover` renderer belongs only to the editor's Web cover preview; Mobile thumbnail previews the accepted tile/title composition.

## Components

- **Button:** Primary, secondary, outline, ghost, and danger variants remain available. Minimum height is 48; loading/disabled state is announced and prevents action. The eligible ICS override changes corners and horizontal padding, including course content.
- **Input:** Active v2 fields use minimum height 52, 16-point text, theme surface, 1-unit border, brand-ring focus, secondary placeholder and an announced error. The lower-level TextInput adapter adds eligible typography.
- **Card / AppHeader:** Active v2 Card uses the soft structural surface; AppHeader removes its separator and permits title wrapping, with 48 × 48 icon controls. Course content uses the same eligible shared presentation.
- **Dashboard overview:** Student tasks open existing assignment destinations; professor rows open real grading and enrollment queues. Queue rows are disabled until data exists. Loading/empty values are explicit; fixture names and counts never become product content.
- **Course card and class images:** Preserve the accepted left-thumbnail/right-title card, metadata below, 48 × 48 links/reorder controls, 14-radius reorder buttons and `SurfacePressable` feedback. The instructor-only Customize class cover action opens **Class images**. **Mobile thumbnail** is the default tab, previews the accepted 58 × 64 tile beside its title, offers five square subject presets and requests a 1:1 crop for photos; **Web cover** retains its wide preview, 16:5 photo crop request, five existing wide presets and web-image removal. Drafts survive tab switches; Save changes submits only changed fields and confirms the response. Mobile reset inherits the web image, while web removal preserves a separately chosen mobile image. Errors stay in the sticky action footer. Old responses lacking the new field show a backend-update warning and disable mobile saves; web-only edits remain available. Existing private-image/account guards and intact Expo File/web Blob transport remain. The Android unregistered-launcher restart guidance still applies; new crop/runtime acceptance is pending.
- **Course workspace:** Student/professor index screens apply recovered first-phase style objects through `useIcsStyles`. Manrope and eligible shared Card/Button/AppHeader/modal behavior continue inside courses; the erroneous route exclusion is removed. Do not substitute old Git styles or approximate the checkpoint from rejected later captures.
- **Course announcement meeting action:** `CourseMeetingLinks` runs on announcement content for both roles. It recognizes the same HTTPS exact `meet.google.com` room/lookup paths as the web helper, rejects lookalike hosts/credentials/unsupported paths, and deduplicates URLs. Outline Join Google Meet buttons use the existing safe opener/native Linking, with an inline announced error. Multiple valid destinations receive numbered labels. This is a local action over posted content; no API/auth/database change or automatic meeting join is added.
- **Tools sheet:** Groups preserve learning destinations and include Ohmward for students and professors. Sign out retains its v2 confirmation and existing logout behavior; Switch Account UI is removed. Modal opening focuses the heading and hides background accessibility descendants. Closing restores the original account/More trigger through iOS dismissal and an Android/web close effect; route/logout actions suppress restoration. System Back and accessibility escape request close. Native screen-reader focus behavior still requires device verification.
- **CodeLab fullscreen:** Enter/Exit full screen changes CSS on the mounted editor, preserving code, selection, and draft. The visual viewport controls sizing when the keyboard opens. Native header visibility changes without remounting the WebView. Escape and Android Back exit fullscreen first through the existing bridge protocol; ordinary Back/Done retains embedded history and unsaved-work confirmation. Fullscreen, Gboard, Android Back, and preserved code were exercised in the fixture-backed Android emulator; iPhone and physical-device acceptance remain pending.
- **Ohmward workspace:** Student and professor dashboard/menu entries use the authenticated in-app web workspace and narrowly allowlisted Ohmward paths. Preserve existing lessons, progress, sandbox, instructor analytics, and access checks. Expo Web preview offers the existing portal continuation rather than pretending to run a native WebView. Device circuit dragging and pin selection remain pending.

Independent-image verification is recorded in [mobile-course-images.md](../../quality/mobile-course-images.md): both TypeScript checks, 46 mobile tests, 15 resource tests, the final synthetic preview and short-title recapture pass. Twelve editor captures cover both targets at 320 / 390 / 768 in both themes in `tmp/mobile-cover-review`. The final title is **Class images**; reviewer disposition is **ship** for source and supplementary previews. The initially absent live field was then added through the specifically authorized migration and recorded with targeted Prisma resolution afterward. Normal-principal read-only checks confirm nullable TEXT, no default, runtime SELECT/UPDATE privileges and matching migration checksum. All six Arena-prefixed tables remain; no unrelated migration ran, and the temporary owner file was removed. The final production web build passed, including TypeScript, static pages and traces. Backend deployment, live-backend saving, new native crop/photo-library interaction, hardware accessibility/performance and iOS acceptance remain pending. The accepted course layout is unchanged.

The later square-banner amendment adds a two-column Mobile class banners grid with artwork, labels, selected border/check and accessibility state. Selecting a preset clears the pending mobile photo. Programming, Database, Networking, Web development and Cybersecurity SVGs are 256 × 256, using existing image palettes and large centered subject symbols; their source is `apps/web/public/course-banners/mobile/`, bundled by `apps/mobile/src/lib/mobile-course-banners.ts`. Preview and saved-preset rendering need no web asset deployment or bearer token, while saving still requires backend deployment. Exact mobile paths are allowlisted separately from wide web presets; private-photo validation remains. Only this editor uses a numeric maximum height of window height minus safe-area insets and 32, clamped at zero; shared FormModal is unchanged. No new database change is introduced.

For this banner amendment, 46 mobile tests, both TypeScript checks and the full synthetic preview pass, including all five preset decode/selection states, independent mobile save, photo replacement and reset. Twelve light/dark 320 / 390 / 768 editor captures are in `tmp/mobile-banner-review`. Fresh review found no material UI issue; its **fix** disposition covered only stale design documentation, now corrected and scored **ship** on the final pass. All nine Android source modules match the approved tunnel. Native hardware rendering and live-save acceptance remain pending. The accepted card/interior baseline is preserved.

## Do's and Don'ts

- **Do** keep the native presentation behind its shared auth-derived context and default-off build flag.
- **Do** use accent ink for small orange foregrounds and validate actual light/dark contrast pairs.
- **Do** preserve live API values, native controls, safe areas, offline behavior, recovery, and existing route semantics.
- **Do** verify large type, both themes, native gestures, and assistive technology on the declared devices before acceptance.
- **Don't** extend these native exceptions into authentication, onboarding, other institutes, unsupported roles, or the shared web design system.
- **Don't** mutate global Text/defaultProps, invent course art, or import illustrative concept data.
- **Don't** replace the confirmed thumbnail card or recovered interior checkpoint with old Git geometry, a top banner, a route exclusion, or a new visual interpretation.
- **Don't** expand the authorized student-header, top-Labs-removal and announcement-Meet amendment into another card or classwork redesign.
- **Don't** report browser fixtures or successful compilation as native accessibility or performance evidence.
