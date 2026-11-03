# Sprint 2 web deployment handoff

This is an operator handoff, not evidence of a live deployment. Use an isolated staging target before production. Keep the Sprint 1 migration, vault-key and rollback instructions in `sprint-1-deployment.md`.

## Database and session rollout

Back up the intended database and verify its identity and restricted runtime principal. Rehearse both additive migrations with the migration/owner role:

- `prisma/migrations/20261020140000_session_idle/migration.sql`
- `prisma/migrations/20261020150000_private_upload_scan/migration.sql`

Regenerate Prisma and deploy the matching web build after the schema is ready. Runtime table grants already cover added columns; verify actual privileges and the existing Super User boundary rather than granting an owner role to the app.

Sessions expire after 30 minutes without qualifying activity or seven days after creation, whichever comes first (an earlier stored expiry still wins). Refresh cannot move the seven-day boundary. Before its first live application, the idle migration was revised to initialize existing `lastSeenAt` values to 1970-01-01 using DDL, then restore the current-time default for new sessions. All existing sessions require a fresh sign-in. This avoids row updates that the privileged-session admission guard rejects for an owner connection; the guard remains enabled. Earlier local evidence used a creation-time backfill and is historical. Opaque tokens remain the client credential; internal database session IDs are no longer accepted. Password changes use the registration/reset password policy and revoke all sessions in the same transaction, then redirect the web user to sign in.

For a deployment missing only this session column, `node scripts/repair-session-idle.mjs --apply --owner-stdin` accepts an owner URL through hidden terminal input, verifies the configured database, applies the targeted migration transactionally and records its checksum. It preserves existing session fields, refuses conflicting schema/history and does not run unrelated pending migrations. If another environment already applied an earlier checksum, reconcile that history explicitly; never overwrite a finished migration record.

Verify web-cookie and native bearer flows, password changes, sign-out, expired sessions and existing role ceilings on staging. No access/refresh JWT migration is involved.

The visible web study timer marks foreground input activity on its existing heartbeat, at most once per minute. That allows long editor sessions to remain signed in while the user is interacting. Hidden/offline/idle polling, unmarked heartbeats and refresh requests do not extend idle time. This is a client activity signal under an already authenticated session, not a new authorization credential; the absolute seven-day limit always applies.

## Private uploads and scanner

New `/api/upload` files are scanned before being persisted as PostgreSQL `PrivateAsset` bytes. The response keeps `{ url, fileName, fileSize }`; generated URLs use `/api/assets/<uuid>`. The download route authorizes the current session against ownership, published course material/cover, submitted work, form answers or the owner's intentionally shared institute avatar. Merely knowing a URL does not grant access. New references to private uploads must belong to the writer.

Antivirus scanning is disabled by default. Uploads still enforce file-type checks, size limits, quotas and authorization, but do not detect malware. Files accepted without scanning are stored as `UNSCANNED`, never `CLEAN`. To enable scanning, set server-only `FILE_SCANNING_ENABLED=true`, `CLAMAV_HOST` and `CLAMAV_PORT` for a trusted private-network clamd service. When enabled, scanner outages or invalid verdicts block uploads with 503; infected files are rejected. Existing unscanned files remain accessible under the same ownership and course access rules.

The scanner must have current signatures and suitable `StreamMaxLength`, recursion, decompression, file-count and scan-size limits. Enable rejection/reporting when limits are exceeded; do not accept an oversized archive because the engine silently skipped its contents. Verify clean files, the standard antivirus test signature, password-protected archives, decompression limits, outage recovery and signature updates with the actual provider. The local wire-protocol fixture is not a real malware-detection test.

Application limits are 25 MB per file, a bounded multipart body, 30-second body-read deadline, 10-second scanner deadline, two active upload operations per warm process, 20 attempts/minute per account and 250 MB stored per owner. Scanning and multipart parsing hold bounded buffers in memory. Measure peak memory with the deployment runtime and configure hosting body/time limits consistently; a platform can impose a smaller request limit. No 25 MB hosting capability is claimed without that verification. The database must have storage/backups appropriate for file bytes. At the full 250 MB allowance, 400 users could require roughly 100 GB before database/index/backup overhead.

Content signatures must match supported file extensions and MIME types. Plain text/CSV must be UTF-8 without binary control bytes or active HTML. New binary DOC/XLS/PPT uploads are rejected; use PDF or their supported OOXML equivalents. File names are display metadata, not filesystem paths.

Existing data URLs, `/uploads` files and public provider links remain legacy references; this change does not retroactively make their original public locations private. Existing `PrivateAsset` rows default to `LEGACY`, and the new serving route requires a clean record. Inventory, scan and migrate historical academic files with verified owner/resource bindings before deleting/restricting old public objects. Preserve intended public branding separately. No historical file deletion or live migration was performed here.

## Browser policy and caching

Middleware sends a fresh CSP nonce to the Next render and response. Production scripts have no `unsafe-inline` or `unsafe-eval`; existing style allowances remain for the current UI/editor. Root rendering is dynamic, so do not cache personalized HTML or reuse a nonce across responses. Preserve the CSP/request headers through the hosting proxy. Check authenticated pages, Monaco workers, PDF/document viewers and required external embeds against the actual providers.

Sensitive API/page responses use private/no-store behavior. The `cdm-lms-public-v2` service worker caches only the public asset shell and removes older LMS caches on activation. Verify worker update/activation on an existing browser profile; account pages, course APIs, uploads and grades must not be available from the old offline cache after rollout. Offline navigation shows the public offline page.

Mutation origins are compared against the actual request protocol and Host; forwarded-host is not authority. Cookie-bearing requests require the same origin. Explicit bearer-only clients can use configured `ALLOWED_ORIGINS`; existing privileged/academic handler guards may impose their stricter same-origin policy. Missing browser-origin headers remain compatible with non-browser bearer clients. Verify the real reverse proxy protocol/Host and existing native client requests; never set a wildcard credentialed origin to fix a proxy mismatch.

## Bounded views and shared-client contract

The web gradebook and HTTP endpoint return 50 students/page with all graded activities up to 200. Above that activity limit, or when a submission has more than 20 attachments, the interactive view gives an explicit error rather than a partial grade/file list. Gradebook attachment links load content through an authorized endpoint instead of embedding data URLs in the matrix. CSV export retains its existing assignment/quiz scope and complete-roster behavior.

`GET /api/courses/<id>/gradebook?page=N` includes `pagination`. The connected shared API client fetches bounded pages sequentially for its existing complete-roster consumers, preserving mobile screen behavior without editing those screens. That compatibility adapter deliberately retains the client's whole-roster memory cost and caps that legacy view at 200 pages (10,000 students). A future mobile paging UI remains the other developer's work.

Risk analytics pages 50 enrollments and reads history only for the selected students/courses. It explicitly rejects views with more than 2,000 activities instead of reporting incomplete risks. Counts, local search and descending risk order apply to the selected page, as labelled in the UI; the pages themselves follow stable student-name/enrollment order. This is not a global highest-risk ranking across unloaded pages.

Study heartbeats avoid hidden/offline/idle polling and overlapping requests. Judge0 admission is limited to four pending executions per warm process with the existing execution deadline. This is not a distributed worker quota; test all instances against actual Judge0 capacity in Sprint 3. The database production pool remains two connections/process. No connection-limit increase was made.

## Rollback and remaining release gates

Keep backups and the prior application artifact. Prefer rolling application code back while leaving additive columns in place; do not drop session/file data under a running app. Reverting the scanner boundary can reintroduce public-upload behavior, so evaluate that risk before a rollback. Test the specific previous artifact against the expanded schema and existing security guards on staging.

Before release, verify real scanner/storage behavior, historical file migration, proxy/CSP/worker updates and hosting request limits. Then run Sprint 3 capacity, backup/restore and operational checks. Local 400-row fixture measurements do not establish 400 or 1,000 concurrent-user capacity, provider security, disaster recovery or an ISO/IEC 25010 score.

Include shared-campus/NAT sign-in bursts in that capacity review. The current product default is 10 login attempts per IP per 15 minutes, alongside account limits; many legitimate users behind one school IP can hit that budget. The browser matrix explicitly uses a 100-attempt fixture-only IP budget to exercise its many distinct logins. It does not validate the default rate policy for a campus-wide sign-in burst. Calibrate the deployed IP policy from the intended workload while retaining account/brute-force protections.
