# Independent V1 hierarchy/contract review — dispatch blocked

2026-10-09, Asia/Singapore. **DISPATCH_BLOCKED / REVIEW_NOT_STARTED. No independent architecture verdict exists.** The human authorized comparative review only. No formal lifecycle advancement, run initialization, lease, account provisioning, tests or implementation was performed.

The attachment references `012-v1-super-user-hierarchy-and-contract-adjudication.md`; the existing corrected artifact is `plans/012-v1-super-user-hierarchy-contract-adjudication.md`. Its binding was verified rather than renaming or replacing historical artifacts. Program Head remains an essential approved requirement deferred to V1.1/V2. OPEN-2 A and OPEN-5 C remain review-only selections, with operational decisions and risks outstanding.

## Exact dependency failure

Three attempts used the existing approved executable `C:/Users/kirby/AppData/Local/DockerSandboxes/bin/sbx.exe`, microVM worker `harness-repair-20261005` and the previously approved Codex `sandboxd` OAuth-broker configuration. Each failed at the preparatory worker `exec ... mkdir -p /tmp/su-v1-review-<nonce>` command. The provider attempted its normal daemon startup and exited with status 1 before a reviewer could run.

The reported failing dependency is the sandboxd backend's **main ttrpc listener**, at:

`C:/Users/kirby/AppData/Local/DockerSandboxes/sandboxes/state/sandboxd/containerd/containerd.sock.ttrpc`

Current refusal: `failed to get listener for main ttrpc endpoint: remove ... containerd.sock.ttrpc: The file cannot be accessed by the system.` The daemon consequently reported `daemon exited unexpectedly: exit status 1`. This establishes endpoint access/startup failure; it does not establish whether an ACL, stale endpoint, file owner or another process caused it. No logs, credential values or signing keys were read to investigate further.

Supported action attempted: authorized dispatch through the trusted host execution context and the unchanged approved provider path. It did not restore availability. No manual endpoint deletion, service restart, credential refresh, repair workflow, replacement provider, native fallback or shared-workspace reviewer was attempted. The closed Docker/Sandbox runtime-repair task remains closed.

## Dispatch receipts and planned coverage

All timestamps below are Singapore time (UTC+08:00); receipts retain exact UTC timestamps. These are real **host dispatch-attempt receipts**, not reviewer-authored conclusions or successful reviewer session receipts.

| Request | Started | Session | Planned paths | Actual reviewed paths | Result |
|---|---|---|---:|---:|---|
| SU-V1-HIERARCHY-TRANSITION | 2026-10-09 10:37:55.410 | null | 14 | 0 | Provider startup failure; exit 1 |
| SU-V1-PROVISIONING-AUDIT | 2026-10-09 10:37:56.875 | null | 17 | 0 | Provider startup failure; exit 1 |
| SU-V1-CONTRACT-FIXTURES | 2026-10-09 10:37:57.986 | null | 25 | 0 | Provider startup failure; exit 1 |

Request manifest: [013-independent-hierarchy-review-manifest.json](013-independent-hierarchy-review-manifest.json). Each packet has an explicit path/hash subset and method/symbol evidence. Shared paths are deliberate; the union covers the entire 012 minimal source set: **20 distinct source/controller-document paths, three common contract/evidence documents and seven frozen fixture paths**. The 172-operation inventory and C backlog remain file/hash references only; their bodies were not reopened. This is planned packet coverage, not full operation-inventory review or reviewer coverage. All actual reviewer coverage is zero; no packet reached a Codex reviewer.

Receipts:

- [Hierarchy/transition attempt](013-su-v1-hierarchy-transition-dab27f21-ec05-4232-8f0e-1e1fd74ad232.receipt.json)
- [Provisioning/audit attempt](013-su-v1-provisioning-audit-e2a9b803-c3da-4410-97bb-fe32587dd0df.receipt.json)
- [Contract/fixtures attempt](013-su-v1-contract-fixtures-0f0bf563-7fb9-4f2a-9017-e256e05dcfed.receipt.json)

Each receipt records request/source/contract hashes, exact assigned path hashes, approved provider executable/worker/configuration and planned guest directory, UTC start/end, exit status, null session ID, startup error, transcript/stderr hashes and false successful-session/coverage flags. Output hash is null because no reviewer output exists. The intended isolation configuration was preserved; no fresh session's realized isolation can be attested because startup failed.

## Verified source and contract bindings

| Binding | SHA-256 |
|---|---|
| Corrected 012 contract | `9d7f33e4c9622bb3691bfa3ecdd68cf8035dbe89f1c8edf06ebdc9e9da6dc639` |
| 012 evidence manifest | `ffce97a9d9895f3e5c093f676874eac8b64e6893154cbd9649b316580c0e1ded` |
| Recorded controlled source digest | `9c4cc7834a8615bfad1b11fe243287a49af292a866103dfe7e0de50b3922a1af` |
| Hierarchy/transition request | `00d27664c3f76e3aa03220f498b0d4562e02bad195e165cda96c2c2a85f969d0` |
| Provisioning/audit request | `05e87a11d72b01e68f3df32f2e033f2b66f3896d3841c90734c7671f1b22f700` |
| Contract/fixtures request | `e633a915baee2029348d377fb7b6c254924c007382de70783e712019b0ef0385` |
| Controlled state | `84cdd3d81d77a35fc6553d6794cf4839dcaf3f36a88c028150eb803263bbea4c` |
| Controlled journal | `840daff481602965173a75d374b587327defa3fb2b0359fd471581f336ba3aa8` |

The driver checked all 1,337 recorded controlled-source files and all seven frozen hashes before and after dispatch attempts. Hashes of 012, supplied historical documentary references and state/journal matched their retained bindings. No product or database behavior was exercised. Exact per-file hashes and method/symbol scope remain in 012 evidence and the new request manifest.

## Findings, dispositions and remaining decisions

**Independent findings: none available. Finding dispositions: none adjudicated.** This must not be read as “no defects.” No independent session started, and prior AF/R1/R2 findings are not relabeled as current-review results. No documentary fix, candidate selection or prepared fixture is treated as a resolved finding, architecture PASS or accepted predecessor stage. The current package cannot progress to final requirements/plan acceptance without the required independent review.

The following are **existing documentary pending items from 012**, not newly authored independent findings. Their blocking effects still require independent assessment:

| Pending item | Current documentary blocking effect |
|---|---|
| Provider startup/main ttrpc endpoint access | Blocks review dispatch now; independent findings/coverage/verdict cannot be produced. |
| Actual legacy account mapping reviewer, distinct approver/operator, eligibility ledger, temporary compatibility grants/expiry/exit, reversal criteria/window | Blocks final transition plan/provisioning or actual mappings. A selection does not grant compatibility. Review must assess whether missing policy details also block architecture acceptance. |
| Frozen stored-ADMIN positives after mapping/compatibility retirement | Blocks unqualified expanded-contract verification applicability/plan acceptance until independently reviewed. All seven files stay unchanged; mapping the seeded role would conflict with raw-role assertions. |
| Real operator, protected credential handoff, holder verification, failed-handoff containment, honest User-FK audit/receipt attribution | Blocks final provisioning/recovery plan and provisioning. Comparative review must determine any architecture defect/contract contradiction; none is closed by choosing C. |
| Ambient role-agnostic public reset paths, OTP log/response/delivery behavior, initial activation, session/reset-grant races and transactional audit | Unresolved review subjects with potential architecture/contract impact. C does not fix these paths. Required contract changes need precise independent findings, separate human approval and reviewed verification artifacts. |
| Initial Super User holder identities/operator approvals and actual existing ICS home binding | Blocks bootstrap and account provisioning; identities are not invented. Home institute never grants scope. |
| Privacy approver, manifest maintainer/reviewer, production dataset binding, expiry and revocation governance | Blocks production metadata disclosure and any plan claiming enabled production disclosure. Deny-by-default remains mandatory. |
| Future Program Head representation/capabilities, unassociated-course policy, migration/backfill and concurrency/regression verification | Later V1.1/V2 intake/architecture/migration/verification prerequisites. Essential approved requirement remains deferred; no V1 schema/storage/authority is introduced. |

No operational identities, deadlines, compatibility grants, delivery channels, catalog entries or program IDs were fabricated. No new human contract question is represented as reviewer-authored without an actual reviewer output.

## Next step and stop

The trusted host/operator must restore the approved provider's main ttrpc endpoint/daemon availability through a separately authorized operator path, without reopening the completed feature-side repair task or substituting a provider. Then retry the preserved hash-bound packets through genuinely fresh isolated sessions and retain their real output/coverage/receipts. This review task stops at **DISPATCH_BLOCKED**, not REVIEW_PASS or an invented REVIEW_FAIL judgment. No supplementary tests, new run, lifecycle submission, HIGH implementation approval, lease, provisioning or implementation is authorized or performed.
