# Security inventory at the Sprint 6 checkpoint

The [verification record](sprint-6-verification.json) pins the tested Sprint 5 tree and changed Sprint 6 source hashes. **Verified** below applies to the workload described. The original audit target and coverage ledger remain independent records.

| Mechanism | State and evidence | Remaining boundary |
|---|---|---|
| Administrative MFA | Implemented. Existing privileged regression cases pass. Synthetic recovery restored the configured wrapping key, validated a factor and preserved recovery-code subject binding. | Real administrator enrollment, device accessibility and production key custody. |
| Ordinary-role MFA | Partially qualified at the shared cryptographic layer. Application enrollment, replacement, recovery and cross-client challenge enforcement remain open. | Password, Google, browser, mobile and Electron must consistently complete the MFA admission step. Prior blocked authentication validation remains excluded. |
| Password hashing | Both readers are locally exercised. Self-service and instructor provisioning have nonproduction Argon2id paths. Instructor creation and audit occur in one transaction. | Registration, activation, recovery, protected provisioning, supported rollback builds, licensed corpus coverage and hosting benchmarks. |
| Sessions | Verified selected account revocation, expiry and strict UTC transition. The seven-day rehearsal serialized the prefixed cookie via Next.js and checked its flags and deadlines. | Actual browser/Electron cookie delivery, mobile bearer workflows, same-origin compatibility and production approval. |
| Rate limits | Persistent counter, bounded cleanup and actor-scoped policy. The added instructor quota uses the authenticated admin account. Local contention measurements support the scoped SQL workload. | Neon latency, pool saturation, storage growth and other operation classes. |
| Institutional isolation | Existing server RBAC/resource filtering plus synthetic Prisma Course policies. Restricted definer, Course owner, backup and runtime roles exercised. | Neon transaction pooling, operational writer grants, jobs, global-role restoration and phased migration. |
| Integration and academic controls | Prior scoped tests and fixes retained for management, CodeLab, Ohmward, grades and supported features. | Real-device exercise, provider isolation attestations and any original blocked or deferred cases. |
| Security logging | Fixed metadata audited for provisioning, password change and prior administrative export. Incident and retention proposals identify custodians. | Operator-confirmed alert routing, retention and service-wide monitoring. |
| Supply chain and CI | Reconciled local candidate, fresh advisory gate and scoped local scanners. Both Vercel configs and GitHub Actions branch filters preserved. | New high Prisma dependency advisory, real hosted results and deployment isolation sign-off. |
| Recovery | Synthetic database, role ownership and grant restoration, encrypted object/configuration and MFA key compatibility. | Independent custody, separate-cluster reprovisioning, object/database consistency, provider PITR and measured full-service RPO/RTO. |
| Native distribution | Expo SDK 58 retained. Client typechecks and prior bundle/unsigned compilation evidence cover the recorded source. | Native build tooling, installed physical devices, signed release channels and compatible rollback. |

Use the [risk register](remaining-risk-register.md) for the remaining work and [release assessment](final-release-readiness-assessment.md) for owner decisions. ASVS v5.0.0 Level 2 and MASVS remain verification targets.
