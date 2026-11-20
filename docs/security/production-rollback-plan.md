# Production rollback plan

## Before each separately approved change

Record the prior and next build IDs, approved commits, effective feature flags, schema/grant revision, key version identifiers, backup recovery point, native runtime and deployment target. Rehearse the same rollback in a synthetic environment. Assign a release owner, DBA and security lead. The release owner decides to pause based on denied ordinary workflows, credential admission errors, lost audit events, unexplained grant changes, provider availability or unmet recovery targets.

| Area | Safe rollback action |
|---|---|
| App maintenance | Stop rollout and restore the prior authorized artifact that matches schema and credential formats. Verify the previous build ID and ordinary synthetic workflows before removing the candidate from service. |
| Argon2id | Suspend writers. Restore a qualified dual-reader artifact and preserve stored Argon2id credentials. Keep the no-downgrade behavior and previous session revocations. Escalate any writer that can only persist bcrypt before resuming changes. |
| Sessions and cookies | Use a reader that accepts the canonical current cookie and preserve the original UTC legacy cutoff. Verify current logout and both client families. Revoke ambiguous/suspect sessions under operator approval. |
| MFA | Pause further ordinary-role cohort activation using a qualified rollback. Preserve privileged enforcement, keys, encrypted rows, code-consumption state and revocations. Use staffed, previously approved recovery when needed. |
| Database grants and RLS | First halt the affected operation. Apply an independently reviewed grant/policy reversal to the approved schema revision with the correct migration identity. Preserve application-level RBAC and tenant predicates. If integrity is uncertain, rehearse restoration in isolation and obtain separate recovery/cutover approval. |
| Mobile and desktop | Halt publication or rollout. Restore a signed prior compatible artifact and publish only within its runtime channel when approved. Preserve backend compatibility during the rollback window. |
| Backup and monitoring | Restore last verified configuration without discarding captures or shortening required retention. Verify continued alert delivery, independent backup access and approved custody of keys. |

After rollback, record the actual post-rollback revision, flags, schema, session state and any data reconciliation requirement. Retain operator receipts, incident metadata and recovery evidence. Production restore, data correction, redeploy and distribution each require separate authorization. [Recovery procedure](backup-disaster-recovery.md) · [Incident response](incident-response.md)
