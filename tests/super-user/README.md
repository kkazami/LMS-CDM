# Super User interface

The Super User workspace starts at `/{institute}/academic-operations`. Login and the institute root route open the overview. Existing course and administrator URLs continue to work.

The interface follows the LMS theme tokens and institute colors. A desktop sidebar and mobile navigation connect Overview, Courses, and Administrators. The topbar provides institute switching, the saved light/dark preference, account identity, and sign-out.

Data comes from the existing authenticated endpoints:

- `/api/academic-oversight/{institute}/courses` queries current PostgreSQL records for course counts, instructor assignments, the searchable directory, and course details. New courses and edits appear on refresh without a separate dataset approval file.
- `/api/super-user/{institute}/institute-admins` supplies administrator counts and access management.

Unknown counts display a dash when loading or unavailable. Course access remains read-only. Session and role revalidation, institute scoping, explicit field selection, account provisioning, and access audits still apply. No student, enrollment, grading, or assessment data is added to this workspace.

Run `node tests/super-user/ui.browser.mjs` for isolated browser checks. These render the real components with synthetic API responses and compile the actual global CSS. They cover course filtering and details, account creation, confirmed/cancelled suspension, pending login setup, retries, empty/loading states, theme persistence, mobile overflow, institute switching, and sign-out failure. Screenshots and the result receipt are written under `tmp/super-user-ui-review/`. The checks never connect to an application database.

The existing database checks run separately with `node tests/program-head/main-integration.mjs --no-browser`, using the repository's disposable PostgreSQL fixture. This command covers existing authorization and audit behavior; it does not render this interface.

Overview and administrator counts animate for 650 ms as data arrives. Reduced-motion users receive the final value immediately, and assistive technology reads the final value without announcing every animation frame.

Use **Administrators → Edit** to update an administrator's name, email, or password. A new password is optional; every save requires the current Super User password. Email and password changes revoke the target's active sessions and unused reset codes. Role, institute, access status, and provisioning state remain unchanged. Password resets are available for existing accounts whose login setup is complete; pending accounts retain their operator setup flow.

Credential resets require the bounded database function in `prisma/super-user-v1/administrator-credentials.sql`. Run `node scripts/apply-administrator-credentials.mjs --owner-env <protected-owner-env-file> --evidence <successful-integration-report>` once using the existing owner configuration. The installer refuses an unexpected predecessor, verifies current test evidence and account preservation, grants only the qualified application principals, and never changes an account's password during setup. Application routes continue to use the restricted runtime connection.
