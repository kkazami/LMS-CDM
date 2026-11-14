# Mobile class-image deployment

Kirby explicitly authorized enabling/deploying the class-image feature on 5 November 2026. This satisfies the separate human deployment authorization; no further permission question is needed for this scoped backend update. The supplied owner connection is limited to this feature and was not used again because the migration is already applied.

## Confirmed cause and database readiness

The live `/api/health` returns 200. OPTIONS on the existing course endpoint advertises GET, HEAD and OPTIONS only, confirming that the live backend lacks the new PATCH handler. Reloading Expo alone cannot enable saving.

Normal application-principal read-only checks confirm Course.mobileCoverImage is nullable TEXT with no default, SELECT/UPDATE privileges are present and the recorded additive migration checksum matches. All six Arena-prefixed tables remain present. No further database change is required, and no owner credentials were written into the deployment package.

## Isolated deployment package

Vercel authentication and the linked `kaz14/lms-cdm` project were verified. Its root directory is apps/web and Node version is 24.x. The current ready production deployment, `https://lms-eub53xors-kaz14.vercel.app`, records source commit `eba3be4c39c175f7835f808cc9728697f24fae3c`, matching the local Git baseline.

`tmp/mobile-cover-deploy.local` contains that tracked baseline plus exactly twelve feature files: course PATCH/GET, mobile dashboard DTO, two private-image readers, the optional course type, Prisma schema and already-applied migration, and five square banner assets. Website CSS/layout remain the production baseline, independently compared with normalized line endings. Existing unrelated workspace changes are excluded. No environment files, owner credentials, deployment authentication or Git history are included in the source package.

Prepared with `tmp/prepare-mobile-cover-deployment.cjs`; full source inventory/checksums are in `tmp/mobile-cover-deployment-manifest.json`. The initial byte comparison identified Git archive CRLF conversion; comparison was corrected to ignore line-ending representation only. Inventory: 1,467 files, 23,811,594 bytes; source digest `2c0b3ae13c50175183356b37afb65c3ae230c49e4a5384422ad683b552182925`.

The isolated candidate's actual course route passed the API authorization/ownership/input/independent-save tests via `tmp/mobile-cover-candidate-api.test.ts`. The originating workspace already passed 46 mobile tests, both typechecks, source/supplementary UI review and the full Expo synthetic flow. The earlier full workspace production build passed; a hosted build of this isolated candidate has not yet run.

## External execution block

Automatic approval review could not execute the next Vercel CLI command because the account usage limit had been reached. Its diagnostic explicitly states that this is a review-service failure, not a determination that the action is unsafe. The blocked CLI action did not execute. No candidate was uploaded, no production alias was changed, and this work must not be reported as enabled or deployed. Do not bypass the approval check with another tool or route.

Once tool approval service access is restored:

1. Recheck the currently deployed commit/alias and application database target; regenerate the isolated package if the baseline changed. Validate its complete manifest and exclude all credentials.
2. Verify current CLI options; build/upload a candidate using existing production configuration without assigning the live domain. Never inject the owner connection into runtime configuration or run the full migration chain.
3. Check candidate build status, health, static square assets and authorization rejection. Exercise authenticated synthetic instructor mobile/web image saves, reset and student image reads without changing a real class. Use scoped synthetic fixtures and remove them afterward.
4. Promote the verified candidate to the existing production domain under the authorization already provided. Preserve the prior deployment as rollback.
5. Verify live PATCH support, DTO field, instructor save/reload, student asset visibility and web-image independence; reload Expo Go to refetch the compatible DTO. Keep physical-device UI and crop validation distinct from server verification.

Until these steps complete, live image saving remains disabled by the old backend. The Expo tunnel and new picker source remain available.
