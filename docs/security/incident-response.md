# Security incident response

Sprint 6 makes the instructor `ACCOUNT_CREATED` event atomic with provisioning. The event keeps actor and target identifiers, timestamp, institute, normalized role and outcome. The payload excludes email and credential values. Proposed security-event retention, responder coverage and escalation are in the [maintenance policy](continuous-security-maintenance.md).

## Ownership and intake

The release owner receives security reports through a private administrative channel and assigns an incident lead. The security maintainer verifies and triages, the database/storage operators contain access and handle recovery, and the authorized institutional privacy and academic leads decide notifications and academic reconciliation. Keep reports private and use synthetic examples in public issues.

| Signal | First action |
|---|---|
| Suspicious privileged or institute export activity | Confirm administrative authority and compare documented metadata to an approved operation. Notify the incident lead immediately if access cannot be explained. Preserve the relevant metadata receipt. |
| Unexpected password changes, failed privileged MFA activity or limiter outages | Correlate scoped action codes, UTC timestamps and approved internal actor/correlation IDs. Confirm service health or involve the security maintainer. Investigate with approved evidence only. |
| Build, dependency or secret scanner signal | Quarantine the candidate and retain redacted receipts. Rotate a confirmed exposed credential with its issuer and check the deployment history through operator channels. |
| Backup or recovery failure | Alert the DBA and release owner. Preserve the last known valid recovery point and record the observed RPO exposure. Keep production cutover held while recovery is unreliable. |

## Handling sequence

1. Assign incident ID, owner, severity, timeline and affected environments. Record source revision, artifact/build identity, observed boundary and impact. Preserve immutable hashes of approved original evidence and log custody transfers.
2. Contain using the narrowest approved action. Suspend an affected integration or account, revoke active sessions, restrict admin export or pause release where justified. Escalate decisions that would disrupt teaching, change academic records or access production data.
3. Determine scope with explicit operator approval. Store evidence and findings in restricted custody. Coordinate required notifications through institutional privacy and legal owners. Log control activity using allowed metadata only.
4. Recover from a separately authorized and rehearsed backup. Revoke restored sessions and challenge state as appropriate. Verify approved identity, course, data and backup operations and sign off recovery through the release gates.
5. Record lessons, owner, deadline, regression evidence and closure date. Keep outstanding actions on the roadmap.

The new `SELF_PASSWORD_CHANGED` event accepts only actor and target account IDs, existing database creation time and fixed `{"outcome":"UPDATED"}` metadata. The successful update, revocation and event share a database transaction. Existing `DATABASE_TABLE_EXPORTED` retains institute, model, count, limit, format and outcome only. The operator should confirm alert routing, private retention and access. Passwords, hashes, session tokens, factor material, recovery codes, student answers, sensitive record values and raw request bodies must never enter logs. Use sanitized identifiers and redacted scanner summaries.

Proposed response targets are immediate triage for critical, 24 hours for high and seven days for moderate. Aim to contain critical within 24 hours and remediate high within seven days and moderate within 30 days. The owner assigns exceptions and expiry when upstream compatibility prevents patching. High and critical matches continue to fail the dependency release gate. Current alert wiring and after-hours coverage require operator evidence.
