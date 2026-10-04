# Engineering harness v2

This is the repository's software engineering controller. It does not replace or modify
the student-facing AI runtime in apps/web/src/lib/harness.

## What is enforced

Use `pnpm harness` for all state mutations. The controller enforces stage order, artifact
contracts, authenticated role capabilities, hashed bearer leases, exact predecessor hashes,
source freshness, signed approval subjects, criterion/task/test coverage, captured command
results, independent role identities, bounded repairs and release aggregation.

Profiles/quality JSON files describe routing and optional skills. They cannot waive the
compiled safety floor in scripts/harness/gates.ts. Maximum browser quality requires measured
visual regression, accessibility, performance and broader browser coverage.

## Host setup and trust boundary

The calling host is trusted infrastructure. It must launch genuinely independent agent
sessions, restrict their filesystem/tools, protect this controller and its journal from
agent writes, and pin `HARNESS_APPROVAL_PUBLIC_KEY` outside the repository. Controller code,
the public key, journal, command execution and host environment must not be agent-controlled.

For each role, the host generates a random capability of at least 32 bytes, stores its SHA-256
hex digest in input.actorCapabilities, and delivers only that role's raw capability through
`HARNESS_ACTOR_CAPABILITY` to that isolated agent session. Raw capabilities are never written
into run artifacts or shared agent context. Distinct actor IDs and capability digests are
required. Knowing another actor's name does not grant its stage. Stage leases are stored as
hashes; the raw lease is returned once by `begin` and delivered privately to the owner.

Identity separation cannot be established by inventing different names in a single LLM
session. If independent sessions or a protected approval signer are unavailable, stop at
the corresponding gate and report the limitation.

`pnpm harness:host` now provides the Codex CLI adapter. It launches a new ephemeral read-only
session per judgment stage, disables configured MCP/apps/plugins, supplies inspected source and
predecessor artifacts, and constrains output metadata to the exact run/attempt/stage/dependencies.
Capabilities and leases remain in the host; providers never receive them. Executor/test sessions
return proposed contents. The host checks every path, previous content hash, declared manifest and
role scope before applying writes, then submits through the same controller gates. A captured
unique provider session receipt is mandatory for judgment stages in `agentProvider: "codex"` runs.
Runner and deployer use the deterministic command adapter, not an LLM execution claim.

The repair adviser is a separate read-only session with no stage/pass/approval authority. Explicit
`--repair` obtains advice and invokes the existing bounded reducer; implementation, test author,
all mandatory execution and independent reviews follow again. No automatic human approval or
automatic crash/deployment recovery is provided.

```powershell
pnpm harness:host --root C:\isolated\task --run run_example --input intake.json --context task-context.txt --seed-file C:\protected\host.seed --public-key-file C:\protected\approval.public.pem
pnpm harness:host --root C:\isolated\task --run run_example --context task-context.txt --seed-file C:\protected\host.seed --public-key-file C:\protected\approval.public.pem --one-stage
pnpm harness:smoke
pnpm harness:smoke -- --inject-repair
```

The external seed must contain at least 32 random bytes and be protected by the host. It rederives
stable capabilities after restart; the host refuses a seed that does not match the immutable intake.
Use the same pinned public key from initialization onward. Ordinary controller/verify commands
accept `--root` for isolated repositories. Host flags never approve HIGH/CRITICAL work automatically.
Source transmission to the provider and its authenticated login are host authorization duties.
Exported views exclude env/signing/credential files and journal/session directories. Read-only
provider flags and checked proposed writes are not an OS-wide read boundary: a same-user process
may have ambient access outside its view. Production signing requires a separate protected principal.

## Lifecycle and commands

```text
requirements → recon/proposal → architecture red-team → adjudication → plan
→ human approval for HIGH/CRITICAL → implementation → test author → validation
→ QA → security → code review → RELEASE_READY
→ separate human deployment approval → deployment → post-deploy → COMPLETE
```

Code-only work ends RELEASE_READY. It is not a deployment claim.

```powershell
pnpm harness init --run run_example --file input.json
pnpm harness status --run run_example
pnpm harness begin --run run_example --stage requirements --actor host-requirement-session
pnpm harness submit --run run_example --stage requirements --actor host-requirement-session --token $stageLease --file requirements.json
pnpm harness begin --run run_example --stage validation --actor host-runner-session
pnpm harness execute --run run_example --stage validation --actor host-runner-session --token $runnerLease
pnpm harness submit --run run_example --stage validation --actor host-runner-session --token $runnerLease --file validation.json
pnpm harness:verify -- --run run_example
```

`begin` checks the session capability and required human approval before returning a lease.
`submit` accepts stage data, not a fabricated envelope; infrastructure supplies metadata.
`execute` records actual commands but does not submit the stage verdict. Validation's
artifact must cite the captured command IDs. `status` detects and journals invalidation;
`verify` is read-only and rejects stale/partial runs unless explicitly diagnosing with
`--allow-partial`. Missing/unspecified runs return exit 1. Verification also requires an
explicit run ID, so an older passing run cannot be implicitly selected. Example capability
digests are deliberately unusable sample values; the host must replace them before dispatch.

Input JSON contains prompt, profile, quality, deployment boolean, operations, actors and
actorCapabilities. Allowed roles and profiles are in types.ts/contracts.ts. Actor identity
and scope are immutable. Never initialize a new run to conceal a previous failed deployment;
include its reconciliation in the new run's original input and human-reviewed proposal.

## Artifact contracts

The executable validators in contracts.ts and gates.ts are authoritative. Concrete intake,
requirements and plan examples are in examples/. Adapt them to the task; do not reuse fake
session identities/capabilities as real isolation.

| Stage | Required data and pass condition | Failure behavior |
|---|---|---|
| requirements | Unique requirements/criteria, linked IDs, assertions, no unresolved ambiguities | New clarified run |
| recon | Facts with existing repository file evidence; original proposal and assumptions | New run or freshness restart |
| red-team | Complete attack checklist, structured findings, valid requirement IDs | Findings go to separate adjudicator |
| adjudication | Every finding disposition with reason/evidence/resolution; no unresolved human items or deferred high/critical issues | Block planning; obtain decision and start reviewed run |
| plan | Exact files; ac-linked acyclic tasks; finding remediation; argv/test names/coverage; recovery; mandatory checks | New corrected run |
| implementation | Approved scope, truthful delta manifest, no test-author changes; required signed approval | Bounded repair or new plan |
| tests | Test-only scope; every criterion mapped to behavioral command and existing source | Bounded repair |
| validation | All mandatory commands executed in this attempt, same source identity, successful named results | Bounded repair; no retry overwrite |
| QA | Every criterion passes with fresh behavioral execution IDs; current diff identity | Bounded repair |
| security | All ten boundaries assessed; direct negative tests for sensitive product changes | Bounded repair; always independent |
| code-review | Current controller-captured diff hash, all planned files inspected, architecture findings resolved, no blocking finding | Bounded repair |
| release | All preceding gates fresh; approvals unexpired; no current failures; valid recovery strategy | Human attention/new reviewed run |
| deployment | Separate approval; actual reviewed adapter execution; target and idempotency key | Uncertain effects block automatic replay |
| post-deploy | Fresh real health/behavior execution, same release identity | Human reconciliation |

Stages use all preceding artifact hashes as dependencies. Planning documents remain immutable
during controlled implementation. In-scope source changes invalidate implementation and every
downstream gate. Unplanned paths, changed HEAD, or higher risk invalidate recon onward and
approval. After repair, every mandatory validation command and independent review runs again.

## Commands and test-result adapters

Plans declare each command as id, program (`node`/`pnpm`), args[], domain, criteria[], coverage[],
tests[] (exact expected case names), timeoutMs. The runner does not accept shell text, inline
evaluation or arbitrary loaders. Standard static coverage must name the actual repository
command, not `node --version` with a build label. Custom scripts must be reviewed for their
actual side effects; argv classification is not an operating-system sandbox.

Behavioral commands must write a fresh JSON report at `HARNESS_RESULT_PATH`:

```json
{
  "environment": "value from HARNESS_ENVIRONMENT_ID",
  "tests": [{ "id": "AC-001: expected outcome", "status": "passed", "executed": true }]
}
```

No missing named tests, empty suite, skipped/todo/flaky/failing tests or mismatched environment
can satisfy the gate. This records execution; it cannot count meaningful assertions or prove
the assertions reflect the requirement. QA inspects test adequacy independently.

Node tests can use the included reporter:

```text
node --import tsx --test --test-reporter ./scripts/harness/test-reporter.cjs tests/feature/*.test.ts
```

Browser commands must use:

```text
pnpm exec playwright test --config .orchestra/harness/playwright.config.ts
```

The dedicated config preserves developer configuration but disables server reuse/retries,
forbids focused tests and places JSON and attachments in the current execution directory.
Normalized test titles must be unique. Browser raw attachments remain private host artifacts;
only sanitized reports belong in reviewer context. Retained traces/screenshots may contain PII.

For harness-only fixture runs, the runner selects a separate harmless HTML server and test directory
without a database. It cannot select that mode for product profiles. The server binds loopback,
serves only docs/fixtures/smoke.html, has no API/data layer, and starts from the repository root.
Fixture browser checks preserve forbidOnly, zero retries, no reuse and run-local raw/normalized results.

Runtime/security/database/browser checks and product builds require `HARNESS_ENVIRONMENT`,
`HARNESS_TEST_DATABASE_URL` pointing to local PostgreSQL database `harness_*`, and optionally
`HARNESS_TEST_BASE_URL` pointing to a local disposable server. Test credentials use E2E role
variables. Live root credentials are not forwarded. Harness-only unit checks require no DB.
Product behavioral/build execution requires a clean isolated checkout with no loadable root
or apps/web .env files. Otherwise dotenv/Next could reload live credentials despite a scrubbed
parent environment. The runner checks filenames without reading secret values and blocks such
workspaces; inject disposable configuration directly through the trusted host. Existing root
live env files are preserved. Normal developer commands remain available outside release evidence.
The runner disables implicit dependency installation and package-manager switching; install
the repository's pinned pnpm first or provide its reviewed CLI path in `HARNESS_PNPM_CLI`.

Every execution records exact argv, command ID, run/attempt/stage, source HEAD/index/content
identity, timestamps, environment digest, exit/signal/error and sanitized log/report hashes.
Limits: 30 minutes per command and 8MB captured output; exceeding either fails the command.
Web and desktop build outputs are fingerprinted separately from source. Changed/missing build
files invalidate their execution evidence. Browser tests start the built server, avoiding an
unrelated development server. Mobile/desktop targets require their own type/build/behavior
coverage even when selected through bugfix/refactor profiles; a profile cannot hide a target.

## Database and deployment adapters

There is intentionally no bundled production-deploy or destructive-migration command.
The planner must supply and reviewers must inspect a repository-specific adapter. Without
one, these gates remain blocked; build or Prisma generation cannot replace them.

The local rehearsal adapter is `scripts/harness/database-rehearsal.ts --spec <reviewed-relative-json>`.
Its spec supplies an ordered baseline migration prefix, representative seedSQL, preservationQueries,
compatibilityQueries (SELECTs returning true assertions), migrationReview and recoveryAssessment.
On explicit local PostgreSQL `harness_*` configuration it creates unique fresh/upgrade/recovery DBs,
runs real Prisma migrate deploy, compares introspected schemas and preserved rows, checks compatibility,
rehearses a failed transaction/rollback, records migration hashes and drops only the databases it created.
This transaction recovery probe does not establish rollback safety of the feature's actual migration;
review its forward/backup recovery separately. At least one pending migration is required.

Optional disposable infrastructure: `docker compose -f .orchestra/harness/database.compose.yml up -d`.
It uses loopback port 55432 and temporary storage. Explicitly inject the local disposable URL through
the host; never read root live env files. Docker/PostgreSQL must be installed by the host. Schema
validation remains a distinct command; installation/generate/build are not migration evidence.

Schema work requires schema validation plus executed migration review/application, fresh
database replay, existing-database upgrade, compatibility, recovery, data preservation and
post-migration schema inspection. A database report adds:

```json
{
  "database": {
    "targetFingerprint": "hash of actual disposable target identity",
    "beforeSchemaHash": "hash of introspected schema before application",
    "afterSchemaHash": "hash of introspected schema after application",
    "coverage": ["migration-apply", "existing-upgrade"],
    "disposable": true
  }
}
```

Reports must cover each planned action and include named passing tests. Reviewers must
check that scripts actually query/apply the disposable DB and verify preservation. A
truthful report still depends on trusted test code and host infrastructure. Rollback may
mean a forward repair or restoring a rehearsed backup; a Git revert does not undo data loss.
The controller detects common destructive migration SQL and requires CRITICAL reapproval;
it is not a complete semantic SQL or Prisma migration analyzer.

Deployment intent has a CRITICAL risk floor. Plans must include deployment.target,
deployment.idempotencyStrategy and deployment.recovery. Deployment adapters receive
`HARNESS_DEPLOYMENT_TARGET`, reviewed HARNESS_DEPLOYMENT_ values and a stable per-command
`HARNESS_IDEMPOTENCY_KEY`. The environment target must equal the target bound into the approved
plan. `deploymentKey(run)` supplies the stage receipt key; command keys are captured separately.
Post-deploy reports must include the same actual target, and adapters receive
HARNESS_VERIFY_ONLY=true. They must observe the real deployment rather than a local test server.
Providers must implement idempotency; the harness cannot guarantee exactly-once external effects.

## Human approvals

The signer is external to agent sessions. Only the public PEM key is supplied to the
controller in HARNESS_APPROVAL_PUBLIC_KEY. Private keys never enter this repository.

```powershell
pnpm harness approval-request --run run_example --purpose implementation
pnpm harness approve --run run_example --file human-signed-approval.json
```

Approval JSON is `{payload, signature}`. Payload fields: version=2, runId, purpose
(architecture/implementation/deployment), subject, risk, human, issuedAt, expiresAt.
The human signer signs UTF-8 `canonicalApproval(payload)` using Ed25519 and encodes the
signature as base64. See gates.ts for the exact recursively sorted JSON serialization.
Implementation subject binds input and all planning gates. Architecture approval request
also takes `--file adjudication.json`, before submission. Deployment subject binds the
reviewed release. Expiry and risk are rechecked at release/deployment, not just ingestion.
Signer review must include the actual artifacts and target. A cryptographic signature
proves possession of a trusted key, not the human's understanding of the work.

New runs pin the public-key fingerprint in their journal. Substituting or removing that key blocks
replay; provision it before intake. `pnpm harness:key generate-disposable --directory <external-dir>`
creates an encrypted Ed25519 test key with restrictive POSIX permissions or explicit Windows ACL.
`pnpm harness:key sign --key <external-private-pem> --request <reviewed-request.json> --output <approval.json> --human <name> --task-root <isolated-root>`
signs the exact subject/run/risk from a controller request, with a 15-minute expiry. Supply a host-only
HARNESS_SIGNING_PASSPHRASE of at least 16 characters. Keys must be outside both repositories; never
provide that passphrase to agents or command adapters. Disposable test approvals prove the signature
path only and are not human authorization for product work. Same-user ACLs cannot isolate agents
from the signer; use a separate signer account/service and pin its public key through trusted config.

## Failure, repair and restart

```powershell
pnpm harness fail --run run_example --stage validation --reason "host observed failure"
pnpm harness repair --run run_example
pnpm harness interrupt --run run_example --reason "user paused"
pnpm harness recover --run run_example --reason "agent process stopped"
pnpm harness resume --run run_example
```

Failed stages preserve reasons and executed failure logs. A failed command cannot be
overwritten/reexecuted in the same attempt. Five repairs is a hard cap; three identical
failure signatures escalate earlier. Repair clears implementation onward into retained
history. Source changes invalidate downstream evidence. The entire mandatory set reruns.
Source invalidations after accepted implementation consume repair budget too, preventing a
code-change/restart cycle from bypassing the ceiling. Material changes and planning failures
need a new reviewed run. The human must resolve
exhausted loops; do not manufacture a pass by starting a fresh attempt counter.

Recovery records the expected current source without altering immutable gate evidence. Changes
outside approved scope, changed HEAD or increased risk made while failed/interrupted escalate to
HUMAN_REVIEW_REQUIRED. In-scope source changes during a paused review invalidate implementation
and downstream execution/reviews on resume. Five repairs remains the hard ceiling.

Journal entries are appended with sequence/hash chain and fsync under an exclusive lock.
`state.json` is a replaceable derived projection. Replay validates transitions and artifacts.
Recovery refuses to steal a live process lock, quarantines only an incomplete final journal
record, and interrupts unfinished stage ownership. Corruption in complete records is a hard
failure. Stale leases require explicit interrupt/recovery; accepted stages are not replayed.
An interrupted mutation or command consumes repair budget when resumed. Interrupted
deployment is never automatically resumed: reconcile actual external effects with the
operator and preserve the old run in a new human-reviewed reconciliation run.

## Verification scope

- `pnpm harness:typecheck`: this controller/CLI/tests compile; no runtime or product guarantee.
- `pnpm harness:test`: control failure scenarios and fixture runner integration; no live LMS security or migration proof.
- `pnpm harness:check`: schema syntax, web types, route placement, rule presence; no authorization/deployment claim.
- `pnpm harness:verify`: current recorded release evidence and approval integrity; no independent test-adequacy or external-side-effect proof.

The CI workflow runs controller types/tests plus static sensors, propagates failures with pipefail,
refuses implicit dependency installation and retains run-local verification logs. It does not create a product release gate
or deploy anything. Existing Playwright and product security tests remain available but
require independent review for permissive assertions and real server-boundary coverage.

The actual GitHub job must run before claiming CI readiness. `scripts/harness-ci.ts --prepare`
creates a local isolated harness-only branch and manifest; it leaves the user's application edits
and checkout intact. Remote `--publish --prepared <manifest>` requires explicit authorization to
use GitHub credentials, push that reviewed branch and open a draft PR. It never merges or deploys.

| Boundary | Responsibility |
|---|---|
| Controlled by harness | Contracts, provenance, scope broker, source/target binding, pinned public key, transitions, bounded repair, captured commands and gate aggregation |
| Controlled by host | Distinct provider sessions, OS read/tool/process isolation, seed/key protection, provider login, approved infrastructure and GitHub publication |
| Requires human judgment | Requirements, architectural applicability, real assertion quality, SQL/data/compatibility risk, recovery and signed approval understanding |
| Not guaranteed | Same-user secret isolation, semantic completeness of tests/heuristics, externally immutable services, exactly-once external deployment, safe rollback of arbitrary migrations |

Migration from v1: old state.json, sprint approvals, rubric scores and evaluator logs cannot
be upgraded into a pass. Preserve them as context and initialize a new v2 run with fresh
requirements, adjudication, approvals and executed evidence.
