# Form authoring and scheduled student access

## User workflow

1. Choose Quiz, Activity, Midterm Exam, or Final Exam and create a **draft**. The category remains the Classwork and gradebook category.
2. Write questions and answer keys. The builder batches typing after a short pause, serializes requests, and retains failed edits for explicit retry. Preview, publish, and the Back to Classwork control wait for pending saves. Leaving the page with unsaved work warns the instructor.
3. Review **Start date** followed by **Due date** in Settings. Inputs use the device timezone; the builder summary and student notice identify Philippine time explicitly. The due date must follow the start date. Publishing with an expired due date is rejected.
4. Preview, then confirm publication in the LMS dialog. Validation errors appear in a dialog and a fixed notice, with links to the affected question or setting. Save errors remain visible even when the instructor scrolls down.

Drafts stay private. Publishing a future assessment immediately shows its title, category, points, opening time, and due time in eligible students' **course Classwork**. Selecting it shows **This quiz/activity/midterm exam/final exam opens on ...**. It does not create an attempt or expose questions, descriptions, attachments, passwords, or answer keys. The page rechecks at the start time and when focused; it also has a manual availability check.

At the start time the normal assessment page becomes available. Students must explicitly choose **Start assessment**, including entering an access code when required. The attempt deadline is the earlier of the timer deadline and the form due date. The existing task/dashboard/content APIs continue to hide not-yet-open assessments; only the web Classwork surface opts into safe scheduled metadata.

Publication writes one deterministic, transaction-bound in-app notification per eligible approved student. Future assessments announce the opening time, rather than saying the questions are available. Notification failures roll back publication. Repeated publishing does not duplicate the initial notification. No external delivery or scheduling service is needed for the time gate.

## Preserve existing student work

All form question/section additions, edits, deletions, reordering, and bank imports use the same SyllabusItem row lock as attempt creation. Content edits before any attempt move a published assessment back to draft; the instructor must publish the revised content. After any attempt exists, question definition writes are rejected. The builder shows the lock and preserves access to appropriate settings.

Started assessments cannot change category or move their start date into the future. Form deletion and the generic Classwork deletion action reject forms with attempts; close the assessment instead. Closing, publishing, settings updates, and question writes participate in the syllabus locking protocol.

Settings changes keep Classwork category, title, instructions, deadline, and integrity flags synchronized. Changes to score retention or score visibility immediately re-project existing completed scores to StudentSubmission inside the settings transaction. Existing attempt deadlines remain fixed; changing the time-limit setting does not silently extend a started timer.

## UX details and assessment limits

- Settings is a labelled, keyboard accessible modal with focus containment, Escape handling, focus return, body scroll locking, and a visible footer/error area. It cannot close during a save.
- Instructors can explicitly remove an existing access code.
- Single-choice graded questions require exactly one correct answer; checkboxes require at least one. Missing prompts, choices, and answer keys block publication.
- Short answers without an accepted-answer key currently earn completion points for a nonempty answer. The builder explains this. Paragraph, code, and file responses need instructor grading.
- Fullscreen and integrity monitoring record browser events; they do not provide computer lockdown or prevent outside assistance.
- Instructor form creation remains web-only. Institute and existing role/enrollment/group restrictions are preserved; this does not widen the ICS-only practical-lab feature.

## Verification and environment

Local verification on 27 October 2026:

- 29 form integration and browser checks passed: `tmp/roster-import/forms-1793104425681/report.json`.
- 26 practical-lab PostgreSQL checks passed: `tmp/labs/integration-1793104342280/report.json`.
- 18 lab unit checks and 69 harness safety checks passed; web and harness TypeScript passed.
- The production build passed in the final-source owned fixture at `tmp/roster-import/labs-browser-1793104263920/`; the final-source real-cookie lab browser pilot also passed, including correction, resubmission, history, and gradebook projection.

The form browser checks include UI creation of a Midterm draft, question-bank/AI service errors, and prevention of duplicate inserts after a partial failure. No external AI provider was contacted for those simulated failures. The final form browser server log contained no hydration-mismatch warnings.


Run `node tests/forms/assessment.integration.mjs --browser` for the owned local PostgreSQL and real-cookie browser workflow. It covers scheduled metadata and direct links, private questions, group/enrollment restrictions, timer/start behavior, locked historical content, atomic publication/notifications, a student-start/content-edit race, local schedule round trips, failed settings and question-save retries, rapid typing, pending-save preview, actionable publish validation, and student answer flushing/gradebook projection.

Also run web TypeScript, `pnpm test:labs`, the practical-lab PostgreSQL/browser regressions, `pnpm harness:test`, `pnpm harness:typecheck`, and an isolated production build. Results are retained under ignored `tmp/` directories; the final task response reports which checks actually completed.

No schema migration is required for this change. Live saved-form testing remains subject to the configured Neon database being available. Disposable local verification does not establish staging availability or remove the provider quota limit.
