# Course checkpoint restoration — 5 November 2026

**User-confirmed visual baseline:** After reopening the corrected Expo Go tunnel, Kirby confirmed: “Cards and course interior are correct.” Preserve this exact checkpoint/composition for future course work. Instructor image customization remains authorized. This confirms the phone-visible appearance; it does not substitute for the separately recorded accessibility/performance/platform release checks.

**Subsequent authorized amendment:** Kirby then requested a more compact student course header, removal of the top Practical Labs shortcut, and restored Google Meet join actions. [The focused amendment](course-stream-header-meet.md) changes those areas only; the accepted course cards and coursework remain the baseline.

This supersedes the incorrect older-Git restoration in `course-layout-restoration.md`. Kirby confirmed the intended card is the one in the original fourth screenshot: small image on the left, title on the right, metadata and course actions below. The course-interior authority is the earlier handoff stating: “Implemented the ICS redesign with Manrope and DM Serif Display” and “39 tests,” with CMake/Ninja native-build failure and the flag off by default. An older Git revision and intermediate screenshot are not substitutes for that named checkpoint.

## Changes

- Restored the confirmed 58 × 64 thumbnail/right-title card composition, 22-radius surface and original metadata/link/reorder arrangement. Added images remain inside the thumbnail; no standalone banner or overlaid white-title header. Existing SVG banners use contain sizing so their artwork is visible in this slot. Instructor cover selection/photo/upload/removal remains; credentials are still attached only to same-origin private assets.
- Recovered student and instructor `icsStyles` object literals directly from the saved first-phase compiled artifact `tmp/ics-ui-final/_expo/static/js/web/entry-0240d0fe9a97e760a6bfbb4f5bcb54b6.js`, rather than inventing replacement values. Both course hubs read those recovered values through the existing presentation hook. Extraction/provenance report: `tmp/course-checkpoint-restoration.json`.
- Removed the mistaken course-descendant exclusion. It was forcing shared headers, cards, buttons and modals into the older mode shown in the user's rejected screenshot. The original authenticated ICS role/institute/presentation-flag gate remains intact.
- Enabled presentation only in the running approved Expo Go/ngrok preview and ignored `apps/mobile/.env.development.local`. This keeps ordinary development restarts consistent. The committed example and production default remain off, as at the quoted checkpoint.
- Kept existing course data/actions, attendance, grading, submissions/drafts, auth/API contracts and the separately requested image endpoint. No database or production deployment changes.

## Evidence

Mobile typecheck, Expo Web export, nine focused presentation/cover/upload tests and the complete synthetic student/professor preview journey passed. The preview asserts the thumbnail's 58 × 64 bounds, title placement to its right, course-card corner radius, course navigation and instructor preset/removal saves. Current supplementary captures: `tmp/course-checkpoint-review`. The source value recovery establishes the named checkpoint, while fixture screenshots remain supplementary and do not establish the user's phone appearance.

Final source refinements retain the checkpoint's existing press feedback and conditional 48-unit instructor navigation/back targets. The final rerun passed mobile typecheck, **45 mobile tests**, Expo Web export and the full preview journey. A fresh independent review verified all 13 student and 14 instructor override keys against the saved compiled artifact and returned **ship** for source/supplementary previews after the historical documentation was superseded. This is not phone acceptance.

Expo Go tunnel remains running. Its public Android source map was checked against the current card, presentation provider and both course hubs. The actual served Android JavaScript's Expo environment descriptor confirms `EXPO_PUBLIC_ICS_UI_V2` is `true`; this is verified runtime configuration, not an assumption from source. Kirby subsequently confirmed both cards and course interior are correct in Expo Go. Broader physical-device acceptance remains pending. The earlier mistaken revert did not establish this baseline.
