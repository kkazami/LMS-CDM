# Separate mobile class images

## Scope and behavior

The instructor's Expo class-image editor has Mobile thumbnail and Web cover tabs. Mobile opens first, shows the existing 58 × 64 course tile beside its title, and offers five square class banners plus photo upload with a 1:1 native crop. Web retains its wide preview, five existing banners and photo upload (Android 16:5 crop). Each tab retains its draft while switching; one save validates and persists only changed fields. Mobile reset inherits the web image. Web removal leaves a separately chosen mobile photo intact.

The confirmed course cards and interior remain the visual authority. Only the thumbnail source changes: `mobileCoverImage || coverImage`. No new course layout, routes, roles or authentication flow were introduced. This editor is in Expo; the separate website cover UI continues reading/writing its existing wide field.

Only the teaching owner/authorized instructor can save. Uploaded images must be owned private image assets, and student reads retain institute/enrollment/resource checks. Both changes validate before a single course update. Late picker/upload/save results are scoped to the initiating account. Old server responses without the new field disable mobile saving and show the backend-update requirement; web-only changes remain available.

## Mobile banner amendment

Programming, Database, Networking, Web development and Cybersecurity now have dedicated 256 × 256 SVG artwork under `apps/web/public/course-banners/mobile/`. Their large centered symbols and existing image palettes are composed for a near-square tile rather than reusing the 800 × 250 web banner. Expo bundles these exact assets through `mobile-course-banners.ts`; previews and saved preset rendering do not require a website asset deployment or attach bearer tokens. The card geometry remains unchanged.

The Mobile class banners picker shows square artwork, labels, selected borders and check indicators. The local editor max-height resolves against window height and safe-area insets so the longer preset list scrolls while the heading/actions remain reachable. No shared FormModal layout was changed.

The API accepts only the five exact `/course-banners/mobile/{id}.svg` values in the mobile field. Wide presets remain web-only; unknown paths, traversal, cross-target presets and external image URLs are rejected. Existing owned-private-photo validation remains. This amendment needs no further database migration. Saving still requires deploying the pending backend code.

Amendment verification: all 46 mobile tests and both TypeScript checks passed. Expo Web export bundles all five square SVGs; full synthetic student/professor flow passes selecting/decoding each preset, persisting a mobile preset while retaining the wide web banner, then photo replacement, independent web edits and resets. Responsive editor captures at 320 / 390 / 768 in both themes check visible heading/actions and no page overflow. Evidence is in `tmp/mobile-banner-review`, including `teacher-mobile-banner-selected-390.png`. Native-device rendering and live save acceptance remain pending.

Fresh `mobile_banner_finish_review` found no material UI issue in source/supplementary captures. Its sole finding was stale design documentation; the documenter updated all three artifacts and the reviewer scored that fix **ship**. The approved Android tunnel source map matches all nine relevant modules, including the bundled preset module.

## Database and rollout

Applied migration: `prisma/migrations/20261105000000_course_mobile_cover/migration.sql`. It adds only nullable `public."Course"."mobileCoverImage" TEXT`, with bounded lock/statement timeouts. No existing rows, images or Arena tables are deleted. A null value preserves current web-image fallback.

Initial read-only live metadata check on 2026-11-05 found the column absent and runtime unable to alter Course. Kirby then supplied owner access for this additive change only. The owner connection was verified against the runtime target; the exact SQL file executed successfully. A targeted Prisma resolve recorded this migration only after SQL execution. The direct CLI first lacked the monorepo dotenv module path; recording succeeded after setting the child process NODE_PATH, without repeating the ALTER. Final normal-principal read-only verification confirms TEXT, nullable, no default, SELECT/UPDATE privileges and the matching Prisma migration checksum. All six Arena tables remain present. The temporary ignored owner file was deleted and the temporary JavaScript session cleared. No unrelated migration or deployment was performed. Evidence: `tmp/mobile-cover-migration-result.json`.

Migration-first rollout procedure (steps 1–3 completed for the configured database; do not repeat the ALTER):

1. Using owner credentials supplied outside chat/command arguments, verify the intended database matches the app target and review the exact additive SQL.
2. Execute **only** the new migration file in its bounded transaction. Confirm the nullable column and runtime SELECT/UPDATE privileges. Do not run the full pending migration chain: the separate Arena-removal migration is pending and historical migration-checksum reconciliation is unresolved.
3. Only after this SQL actually succeeds, record this exact migration as applied with Prisma's targeted `migrate resolve --applied 20261105000000_course_mobile_cover` against that same database. Never mark unexecuted SQL applied or alter prior checksums.
4. Generate Prisma, build and deploy the backend containing the new DTO/select/PATCH/read-authorization changes. Verify instructor upload and enrolled-student private-image fetch using synthetic accounts, with web image unchanged.
5. Reload Expo Go, open instructor Customize class cover, and verify native crop, mobile tile, reset and account-change behavior on Android/iOS. The current tunnel serves updated source, but this is not phone UI or live-save acceptance.

Rollback: restore the previous app/backend version if needed; leave the nullable column and stored images in place. Do not drop the column as a routine rollback because it may hold instructor choices.

## Verification

- Mobile and web TypeScript checks passed; Prisma client generated and schema validated.
- Final `pnpm build:web` passed, including compilation, TypeScript, all 41 static pages and build traces. The first sandbox attempt failed to create a .next directory; the unsandboxed build completed. Existing middleware-convention and file-type dynamic-dependency warnings remain non-blocking.
- Read-only schema-to-schema diff contains only ADD COLUMN mobileCoverImage TEXT.
- All 46 mobile tests passed, including independent updates, atomic rejection, role/institute/asset ownership, upload bytes/MIME and stale-account handling.
- All 15 web resource tests passed, including new mobile-only image access, enrollment loss, wrong institute, wrong owner and removed reference cases.
- Synthetic Expo Web full student/professor preview passed. Editor flows cover photo upload, separate web edit, web removal, mobile inheritance reset, disabled no-change save, and retained drafts across tabs. Twelve editor captures cover both targets at 320/390/768 in light/dark. Existing card geometry, course flow and account isolation checks pass.
- Supplementary captures: `tmp/mobile-cover-review/teacher-image-{mobile,web}-{light,dark}-{320,390,768}.png`. Android Metro source-map verification through the approved tunnel matches the editor and course sources.
- The fresh finish reviewer returned **ship** for the scored short-title fix and source/supplementary-preview scope. The former title truncated at 320; final **Class images** is fully visible in both tabs/themes. The final full preview passed after this correction.
- Pending: backend deployment, new native device crop/photo-library interaction, physical screen-reader/font-scale/performance checks and iOS acceptance. Browser captures are supplementary and do not certify native behavior. Migration/permission verification has completed.
