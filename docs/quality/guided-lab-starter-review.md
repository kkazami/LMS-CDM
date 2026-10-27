# Guided lab starter review — 27 October 2026

The nine source-defined starters were reviewed for topic alignment, prerequisites, ordered actions, observable results, evidence, and likely points of confusion. This is a content and LMS workflow review, not proof that each physical or Windows Server exercise was performed on classroom equipment. The configured Neon database still rejected a read-only availability check with quota error 53000 during this review; existing instructor-authored templates in that database could not be inspected.

| Starter | Revision and expected student outcome |
| --- | --- |
| MySQL | Separates connection preparation from SQL execution. Explains running creation only once, choosing a fresh name, and checking database/table/row outputs. Keeps installation and credentials outside this task. |
| Ubuntu VM | Orders VM selection, virtual disk confirmation, ISO attachment, installation, ISO removal, and first boot. Adds expected screens and a fix for restarting the installer accidentally. |
| Router LAN | Adds the missing client-address and ping procedure. Separates the router and client addresses, shows a topology, and checks up/up plus connectivity. Does not turn this into an internet-routing exercise. |
| RJ45 | Gives ordered assembly and wire-map testing actions, a numbered T568B reference, and the T568A alternative. Clarifies that simple continuity is not bandwidth certification. |
| Fiber connector | Requires the exact kit procedure and instructor demonstration. Labels the FOA Panduit video as kit-specific, separates inspection from testing, and distinguishes continuity from insertion-loss verification. No universal cleave dimensions are invented. |
| Windows initial setup | Makes the name/restart sequence explicit, collects the assigned network plan before changes, and records update/restart status including offline or policy-managed conditions. |
| AD DS and DNS | Separates role installation from new-forest promotion. Orders the reboot, domain sign-in, DNS-zone checks, and SRV lookup. Keeps DSRM secrets private. |
| DHCP | Confirms domain membership and isolation before installation. Keeps the scope inactive until reviewed, then explicitly renews and inspects the client lease and checks DNS. |
| Windows file backup | Orders sample-folder selection, separate destination, one-time backup, recovery to another folder, and hash comparison. Keeps full-server/system-state recovery outside the exercise. |

## Optional help for each step

In the draft editor, expand **Optional video, screenshot, or guide** under a step. Choose **Add YouTube video** and paste the watch/share link, **Add screenshot** and upload PNG/JPEG/WebP, or **Add reference link** for a public HTTPS guide. Give each item a clear title and, if helpful, a brief caption or viewing tip. Use **Preview**, then save and publish through the normal workflow. Four help items per step keep the list manageable.

Video links normalize to a YouTube watch page and support a start time. They open in a new tab, without autoplay or embedded trackers loading in the lab. Student answers and the current step remain in the LMS. Screenshots appear inline and enlarge in an accessible dialog with Escape/close and focus return. Missing screenshots show a local message; optional help never becomes a hidden submission requirement.

The student runner now exposes the goal, prerequisites, and tools before the step list. A completion checkbox means the task was completed, including an allowed GUI alternative; it no longer claims that an instructor's display-only command must have been run when the same task was completed through Server Manager.

## Source selection

Written guides use MySQL, Ubuntu, Cisco, Microsoft, Fluke Networks, and FOA sources linked in the starter steps and [starter documentation](guided-lab-starters.md). Two optional FOA YouTube demonstrations were checked by title, publisher, and described scope:

- [Panduit OptiCam connector example](https://www.youtube.com/watch?v=9zGAyRtbTBM) — FOA, 2013; explicitly kit-specific, not a substitute for current manufacturer instructions.
- [Connector inspection example](https://www.youtube.com/watch?v=IyumH8CiUPQ) — FOA, 2012; accompany it with the written non-live-fiber requirements.

These are optional external references, not a claim that their entire video contents were watched or that every classroom kit matches them. Official guides with screenshots supplement other steps. The two bundled SVG diagrams were drawn for this repository rather than copied from image-search results. No third-party video or screenshot was downloaded or rehosted.

## Storage and authorization

Optional resources live in each step's existing JSON config, so no schema migration is needed. Screenshot uploads are limited to one image per request, 3 MiB plus 64 KiB multipart overhead, and use the existing private PostgreSQL storage, verified file types, mandatory scanner, upload concurrency limits, and user quota. Saving or publishing validates image ownership, scan status, and type in the transaction; student evidence cannot be reused as instruction media.

The generic asset URL checks exact-version lab references, current ICS authorization, course access, approved enrollment, target groups, publication/start time, and archival rules. Removing an image from a newer draft leaves older published instructions intact. The app has no screenshot deletion or garbage-collection operation; future cleanup must retain assets referenced by ANY historical lab version. Uploading an image without saving the draft can leave an owner-private orphan; it is never exposed to students automatically.

The upload UI blocks saving, closing, and competing workspace actions until scanning finishes. A failed upload shows an error next to that step and can be retried. Previously published instructions and existing academic history are not silently rewritten by this starter review. Instructors must create a new draft/version to update an already published lab.

The instructor must still supply the actual classroom names, address plan, VM allocation, and fiber-kit procedure before assigning the relevant task. Videos and templates do not replace supervised hardware work.

## Verification results

- `pnpm test:labs`: 18 checks passed, including URL validation, older definitions without media, media bounds, and unchanged completion rules.
- Local PostgreSQL integration: 26 checks passed. Report: `tmp/labs/integration-1793035210767/report.json`. Includes scanner failure/rollback, ownership, scheduled/draft/target-group/enrollment access, and published screenshot retention.
- Existing resource/security regression tests: 13 passed.
- `pnpm harness:test`: all 69 passed outside the sandbox. The sandbox attempt failed when Git could not create temporary `.git/config` files; that environment failure was resolved by the permitted rerun. `pnpm harness:typecheck` also passed.
- Web TypeScript passed. The final source built successfully in the owned production workspace recorded at `tmp/roster-import/labs-browser-1793035865525/build.log`.
- Browser tests against that unchanged production build passed in `tmp/roster-import/labs-browser-1793036229016/report.json`. The browser helper verified source hashes before reuse. Both the instructor/student pilot and gradebook workspace regression passed.
- The pilot exercised screenshot upload failure and retry, save/close disabled during upload, actual scanned screenshot persistence, publication, student image enlargement/Escape/focus return, a simulated external YouTube page with answer retention, saved progress, correction, resubmission, history, and grading. It did not depend on live YouTube loading to pass.
- Actual local ClamAV verification accepted clean content and rejected the standard antivirus test signature before persistence. The screenshots themselves used that scanner in the browser pilot.
- Both bundled diagrams were rendered and visually inspected. Long-step focus originally scrolled below the heading; the implementation now scrolls tall sections to their start with header clearance, and the browser test confirms the required-step heading is visible.

This is local evidence only. Live custom-template inspection, classroom equipment demonstrations, and staging upload/workflow checks remain unverified. No live database writes or published-template rewrites were performed for this review.
