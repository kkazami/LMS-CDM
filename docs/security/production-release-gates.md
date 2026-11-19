# Production release gates

Sprint 4 is a local candidate. The owner approves each environment change, migration and distribution release separately. Record the exact Git revision, lock/source hashes, build ID and evidence receipts against every sign-off.

| Gate | Required owner or operator evidence |
|---|---|
| Git and hosting isolation | Establish that the review branch cannot deploy to production or create a preview with production secrets. Inspect the hosting integration, branch policies and environment assignments from the control plane. If needed, disable deployments for the review branch before authorizing push. |
| Hosted CI | Confirm exact job names and pinning for the first safe hosted run. Retain actual dependency, static, secrets, compatibility and aggregate receipts. Require the aggregate status and reviews on protected branches. Keep dependency and secret alerts enabled where available and assign ownership. |
| Production runtime and secrets | Record approved deployed commit and build ID, TLS/ingress and health results, public vs. server-only environment configuration, key identifiers and rotation owners. Verify the configured managed Judge0-compatible endpoint, no-network and resource restrictions, and secret isolation using the established operator checklist. |
| Identity | Confirm every rollback revision reads bcrypt and Argon2id before permitting Argon writes. Approve a reviewed blocklist, hosting benchmarks, all credential writers and legacy recovery handling. Maintain privileged MFA and enrol real administrators using the documented rollout. Require an accessible ordinary-role pilot and recovery readiness before any wider enforcement. |
| Session cookie | Validate browser, native and desktop ordinary admission with both cookie names and stable HTTPS origin before configuring one shared UTC cutover. Record the seven-day dual-read end, completed client rollout, and compatible rollback artifact. |
| Database | Record runtime, migration, backup and operator grant review. Prove actual Prisma/Neon transaction-pooling compatibility and approved operational exceptions, migration rollback and recovery in synthetic staging before any production RLS change. Keep current application authorization. |
| Disaster recovery | Schedule independent encrypted daily backups with 30-day retention and monthly restoration. Verify PITR availability, object/key custody and measured recovery against RPO ≤24h and RTO ≤4h. Identify exam-period RPO needs and costs for approval. |
| Native clients and compatibility | Retain synthetic business workflow receipts, device/interaction evidence, the SDK 58 runtime compatibility record and approved signed artifacts, update channels and rollback path. Validate signed Electron packaging and ordinary login separately. |

Use the [production operator checklist](production-operator-checklist.md), [MFA rollout](admin-mfa-production-rollout.md), [recovery procedure](backup-disaster-recovery.md), and [staging plan](sprint-4-staging-verification.md). This checklist documents release conditions. It records no owner or production approval.
