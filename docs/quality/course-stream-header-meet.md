# Course stream header and Google Meet — 5 November 2026

Kirby explicitly requested three amendments after confirming the course UI baseline: restore a Join Google Meet action, fix the crowded student course header, and remove Practical Labs from the top of that page. The confirmed course-card and coursework composition is preserved.

- The ICS student header uses the existing safe-area container and accessible back control, a small course-code/section line, a full remaining-width title at 18/24 and instructor text at 12/18. Code badges no longer occupy the right side of the title. Other institutes retain the existing AppHeader rendering; no shared AppHeader behavior changed.
- Removed the top Practical Labs shortcut from student and instructor course hubs. Existing tool destinations remain.
- Course announcements in both roles render **Join Google Meet** for valid posted HTTPS Meet room or lookup URLs. Uses the existing native safe-link opener, with visible retryable error text. Links are deduplicated; unsupported URLs/host lookalikes do not create join actions. Announcements remain unchanged and selectable. No meeting is opened until tapped, and no attendance or meeting record is created by this change.

## Validation

Mobile TypeScript and the new parser test passed. The test compares mobile behavior with the existing web parser for meeting codes, lookup URLs, query strings, duplicates and invalid/lookalike/credentialed destinations. The complete Expo synthetic student/professor journey passed, including the unchanged card geometry and cover selection/save/removal.

Stream captures at 320/390/768 in light and dark are under `tmp/course-meet-header-review`. The harness verifies no page overflow, compact header bounds, absent top Labs buttons, one join action for the posted valid link and none for the plain announcement. A stubbed browser opener proves the intended destination without contacting or joining an actual meeting. The instructor stream also exposes the action.

The approved Expo Go tunnel remains running. Its public Android source map matches six current files, including the new meeting component and link helper; the presentation mode remains enabled. These checks prove source availability and supplementary preview behavior, not phone-visible acceptance or an actual Google Meet launch. No API, auth, database or deployment changes were made.
