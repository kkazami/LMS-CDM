# Controlled LMS readiness — 2026-10-04

Readiness is **BLOCKED by the local provider isolation runtime**. Docker Sandboxes v0.46.0 installed with verified Docker Authenticode and the published SHA-256; Windows reported its hypervisor present. Docker and OpenAI broker sign-ins succeeded. However, the sandbox image store failed to pull both official Codex templates, list images, and import the actual official image exported from the working Docker engine. Restart then failed at `containerd.sock.ttrpc` with Windows error 1920, “The file cannot be accessed by the system.” Narrow removal/rename of that task-created endpoint failed too. No worker booted, so no adversarial worker probe or isolated provider session is claimed.

The controlled feature remains **DRAFT**. There is no product implementation, actual feature approval, or product release evidence. Native provider fallback is blocked for HIGH/CRITICAL LMS work. RELEASE_READY is not justified.

## Scope and baseline

The human selected **Super User Academic Oversight and Read-Only Course Supervision**, HIGH risk, with twelve acceptance criteria, explicit ICS/IBE/ITE selection, read-only course supervision, sensitive-data exclusion and preservation of existing role access. Deployment and product database changes are excluded. The complete scope is in `.orchestra/harness/examples/superuser-oversight.context.md`.

Established operational evidence in `harness-operational-readiness.md` remains historical evidence, including real native Codex independent sessions, controller lifecycle, bounded repair, crash recovery, fixture browser execution and CI. It is not relabeled as isolated LMS verification.

The clean baseline is `6c5375b2b033e56d408076755026704003f06bf8`, source digest `e461623db9f76d400371535058bc9caafda294137a43032d6ce2c81dee580224`. Actual [GitHub Actions run 37178147899](https://github.com/kkazami/LMS-CDM/actions/runs/37178147899) succeeded at exactly that head. A fresh local run passed 66 named tests. The baseline manifest contains the complete source file hashes, installed dependency versions/hashes, lock hash, CI inspection hash and named test result hash.

The primary checkout has unrelated uncommitted LMS changes. They were preserved; this task's changes are harness controls, infrastructure fixtures, documentation and draft verification source. The feature checkout is separate under `.orchestra/runs/controlled-superuser-20261004/workspace`, with its own frozen dependency installation. Follow-up harness source and CI evidence are recorded separately in the final manifest; baseline CI does not verify later source.

## External dependencies

| Dependency | Owner | Implementation and observed evidence | Remaining limit |
|---|---|---|---|
| Provider authentication | Human / OpenAI / Docker broker | Both sign-ins completed; OpenAI secret list reports OAuth configured, without exposing tokens | Isolated session cannot start while the image/backend store fails |
| Provider OS boundary | Host / Docker runtime | v0.46.0 installed; no-mount, skills-off, SSH-disabled creation attempted; actual failure logs retained | No working VM, no worker denial proof, no integrated isolated role adapter |
| Protected signer | Trusted host | Separate UID 10001, encrypted Ed25519 key in owned Docker volume, mode 0700 directory / 0600 key, no network; UID 10002 key read gets EACCES; host principal ACL excludes sandbox account | Docker administrator is trusted; fixture signatures are not human feature approvals; provider-to-signer denial still needs actual worker proof |
| Human approval | Human / trusted signer | Controller requires HIGH signatures; wrong bindings and stale source rejected | Exact independent plan and actual human feature approval are pending |
| Disposable PostgreSQL | Host / database adapter | Actual PostgreSQL 17, eight Prisma commands, twelve checks, seeded upgrade, failed migration and corrected forward recovery; all three databases removed | Dedicated harmless fixture proves adapter behavior, not arbitrary LMS migration compatibility |
| Reviewed LMS tests | Independent recon, architecture, test and security roles | Draft direct API, role, institute, mutation, exposure, audit and browser suite prepared | Interface/audit contract remains proposed; no independent review or real LMS execution yet |
| External preflight | Trusted host / controller | Signed run/input/baseline/key/expiry binding; required dependency evidence hashes and six worker probes; reviewed test source locked; missing input blocks before lease | No passing host attestation issued because prerequisites are incomplete |
| Exact-source CI | GitHub Actions / host | Baseline success established; follow-up workflow executes portable tests, real PostgreSQL fixture and separate signer negatives | CI infrastructure tests do not prove isolated provider or LMS behavior |
| Deployment | Human / external adapter | Excluded from this feature | Deployment claims are prohibited; preflight requires an adapter if scope changes |

## Protected approval evidence

`scripts/harness/isolated-signer.ts` provisions a separate encrypted key in a Docker volume. Signing executes as UID 10001 with capabilities removed, no network, a read-only root and the private volume. The passphrase and role seed remain in an external Windows directory whose ACL allows only the human principal and SYSTEM. A read attempt by the default sandbox principal failed with UnauthorizedAccessException. No private material is stored in the repository or sent to a provider.

`tests/harness-integration/signer.test.ts` executed against this actual signer and passed: missing approval, wrong run, subject, risk, scope, expired signature, replaced public key, and source changed after approval. Its human field explicitly identifies infrastructure regression, **not feature approval**. The controller now invalidates an unowned source change after planning/approval and before the implementation lease, including a change within the planned manifest. Existing owned implementation semantics remain intact.

Docker containers share a kernel, and the host Docker administrator remains trusted. This signer boundary is not a production HSM or proof of human intent by itself. See [Docker security](https://docs.docker.com/engine/security/). The actual human must review the controller-generated approval request before the trusted operator signs it.

## Real PostgreSQL evidence

The local service used immutable image `postgres@sha256:d74eeac9a635390a49bc21bd49fccd973de707e2a53a76ac49b552b8712ec46f`, loopback port 30432, disposable storage and dummy credentials. No Neon, root dotenv or application live credentials were used.

The fixture has a baseline table and pending nullable-column migration. Three uniquely named databases exercise fresh replay, baseline plus two seed rows and upgrade, introspected schema equivalence, preservation, compatibility, transaction failure, and real Prisma P3018 / PostgreSQL 42703 failure. An atomic failing DO statement leaves schema/data unchanged; `migrate resolve --rolled-back` followed by the corrected migration succeeds and preserves rows. Cleanup queries confirm no rehearsal databases remain.

Actual successful local result: `workspace/.orchestra/runs/rehearsal-result.json`; evidence directory `database-rehearsal-af826ce02a17488b9ab171fb4b517a3a`. Source at execution was baseline head plus explicit fixture/adapter edits, digest `e4b93e632eec3274b17e53ee321c02824ed817afa5a5df59b06a45561d60adc9`. All twelve named cases passed; eight actual Prisma processes ran, one deliberately exited 1 and seven exited 0. Failed development attempts are retained separately and are not converted into passing runs.

## LMS and preflight evidence

The draft `tests/e2e/controlled/superuser-oversight.spec.ts` requires host-owned loopback fixture configuration and disposable database input, and fails if either is absent. It tests explicit institute scope, foreign course IDs, wrong/inactive roles, direct mutations, sensitive fields/markers, data fingerprints, real audit records and a read-only browser page. Existing-course role access is checked separately. Endpoint and audit choices require architecture adjudication; this draft is not reviewed golden evidence or a real LMS PASS.

A significant baseline observation is that generic `GET /api/courses/[courseId]` checks a session without course ownership/institute authorization. The controlled architecture/security review must prevent that endpoint and other generic actions from bypassing Super User read restrictions. A new page or hidden buttons cannot establish authorization.

The external preflight preserves HIGH classification and checks a pinned external signature, exact run/input/baseline, fifteen-minute lifetime, protected approval key, actual isolated backend, all six denied probes, reviewed test hashes and all ten mandatory server boundaries. PostgreSQL and deployment requirements are conditional on scope. Native provider work cannot silently replace isolation. Unit receipts in `tests/harness/preflight.test.ts` are explicitly synthetic control tests.

## Commands and results

| Command / action | Observed result |
|---|---|
| Clean-baseline Node harness suite | exit 0, 66 named tests |
| Follow-up `node --import tsx --test --test-reporter ./scripts/harness/test-reporter.cjs tests/harness/*.test.ts` | exit 0, 69 named tests; final exact-source CI recorded in manifest |
| `node apps/web/node_modules/typescript/bin/tsc -p scripts/harness/tsconfig.json` | exit 0, including explicit signer integration test source |
| `node --import tsx --test tests/harness/preflight.test.ts` | exit 0, three tests after test-source/boundary strengthening |
| Database adapter with reviewed fixture and explicit disposable variables | exit 0, twelve checks, eight actual Prisma executions, cleanup verified |
| Actual signer integration suite | exit 0, one comprehensive negative-case test |
| Default restricted Windows Node multiprocess suite | exit 1 before test execution: uv_os_get_passwd ENOMEM; same source passed under trusted host execution |
| Official image pull through Docker Desktop | exit 0, immutable digest `sha256:a68b972a59148c6359ade441387159033f6d196d48aef9dda06d2d4bb26eb41e` |
| Sandboxes create, image list and offline import | exit 1, internal image-store errors |
| Sandboxes daemon restart and exact stale-endpoint recovery | exit 1, inaccessible containerd endpoint |

Docker's documented [mountless creation and file-copy workflow](https://docs.docker.com/ai/sandboxes/usage/), [Codex host credential broker](https://docs.docker.com/ai/sandboxes/agents/codex/) and [microVM security boundary](https://docs.docker.com/ai/sandboxes/security/) describe the intended integration. Those documents do not substitute for actual local worker tests.

## Release decision and remaining work

The planned run is `run_superuser_20261004`. Its exact initialization/source, blocked preflight and standalone verifier result are recorded under `controlled-superuser-20261004/final-manifest.json`. The journal remains DRAFT with no lease and no accepted role artifact. No historical LOW run is merged into it.

To finish: repair/provision a working isolated provider runtime, integrate and run actual worker probes and independent sessions, independently review the LMS suite and fixture, seal the genuine external preflight, run requirements through planning, obtain the exact HIGH human approval, then implement and execute all required product checks and independent reviews. The standalone exact-source verifier must accept the resulting release. Current missing isolation, role artifacts, human feature approval and product evidence make RELEASE_READY false. No risk, criterion or gate was removed to produce a pass.
