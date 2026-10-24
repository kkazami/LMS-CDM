# Assessment scheduling and creation review — 2026-10-24

Confirmed issues and changes:

- Published forms ignored `opensAt` in student lists. A shared request-time visibility rule now applies to forms, classwork, course details, assignments, due-soon dashboard items, calendar entries and grade summaries. Drafts, future forms and forms assigned to another group remain hidden.
- The respond page created attempts directly, bypassing opening/closing dates and form passwords. It now renders an explicit Start step and uses the same protected API as other clients. The start controls wait for hydration and use POST; passwords are never placed in a navigation URL.
- `datetime-local` displayed UTC as local time. Settings now round-trip the browser's local time, validate the merged opening/closing interval on the server and preserve the modal on a failed save. Reopening settings reloads the saved values.
- Form editing/results endpoints and question-bank operations checked roles without consistently checking course ownership or institute/enrollment scope. They now reuse course access checks and verify parent form/section/question relationships. Instructor role aliases remain supported.
- Form hashes, code answer keys and hidden scores could reach student payloads. Student serializers omit hashes and answer keys, honor score/feedback visibility on reload and withhold password-protected questions until an attempt exists.
- Concurrent starts could exceed attempt limits. Starts are serialized per student/form and deadlines are capped at the close time. Late answers are rejected; saved answers can still be finalized as a timed-out submission. Answer writes and submission share an attempt lock.
- Autosave counted cancelled debounce calls as in-flight work, ignored HTTP failures and could race submission. Saves are ordered, errors are reported, obsolete failed saves cannot overwrite newer answers, and manual submission flushes pending work first.
- Builder saves could report success on failed HTTP responses or publish ahead of question writes. Writes are ordered and checked; unresolved failures stop publishing. A successful retry clears the corresponding failure.
- Gradebook synchronization wrote percentages into raw-point columns, and LATEST did not order attempts. Scores now use the syllabus point scale with deterministic retention order. Conditional questions which were not shown do not reduce a student's score. Preview submission does not create a real response.

Validation:

- `pnpm build:web` passed (includes the web TypeScript check), repeated after merging production dependency security patches and the concurrent gradebook display fix.
- `node tests/forms/assessment.integration.mjs --browser` passed all 20 checks using disposable loopback PostgreSQL and synthetic instructor/student accounts. Includes real browser → login → API → database → response checks for the scheduled-form and save/submit workflows.
- `node --test tests/web-quality/academic.test.cjs tests/web-quality/sessions.test.cjs tests/auth/login-policies.test.cjs` passed all 12 regression checks.
- Desktop settings and mobile start/result views inspected. The existing responsive shell settles after viewport changes; a snapshot taken mid-transition is not used as a layout verdict.

Operational limits:

- No database migration or historical response/grade backfill is required.
- Visibility is checked on requests; opening does not depend on a cron job. An already-open listing needs a refresh.
- Publishing a future form no longer sends an early notification. This change does not add a scheduled notification delivery job at opening time.
- A streamed Next.js not-found page can carry HTTP 200 after headers have been sent; browser checks assert the denial UI and no attempt creation, while API checks assert 404/403 responses.
- Tests do not modify production assessments or impersonate real students.
