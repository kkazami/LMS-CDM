# Continuous security maintenance

The release owner assigns named deputies for application security, identity, database/recovery, native clients and CI. Keep roles and contacts in the private operations directory. An independent human reviewer signs off changes to authentication, authorization, dependency policy and data migrations.

| Cadence | Work and evidence |
|---|---|
| Every pull request | Required dependency, Semgrep, Gitleaks, scoped regression, typecheck, production-build and aggregate checks on the exact commit. Keep Vercel isolation for security review branches, protect production branches and retain the hosted receipt. |
| Weekly and on upstream advisories | Refresh production and full lockfile inventories, review dependency paths and supported fixes, assign owners and expiry, and block high/critical matches. Test the exact resolved graph. |
| Monthly | Test local and approved isolated infrastructure restoration and validate key/object/database alignment. Review alert routing, availability and credential rotation schedules. Keep operational RPO ≤24h and RTO ≤4h, independently held encrypted daily backups, 30-day retention and monthly restoration. |
| Quarterly and after role changes | Review database, LMS privileged accounts, GitHub, Vercel, Neon, object storage and third-party app grants. Remove unused access through the owner-approved process. Confirm key versions, incident contact coverage, recovery factors and the last approved rollback artifacts. |
| After incidents and security releases | Preserve original evidence securely, add a repeatable regression where authorized, update affected ASVS/MASVS evidence, and record actual verification limits, remediation date and responsible owner. |

Proposed retention is 90 days for operational security-event metadata and a separately approved retention period for incident evidence under an active hold. The privacy and institutional owners approve actual values, access and deletion. Confirm redaction before routing notifications. Escalate critical alerts to the duty owner immediately and unresolved high findings by the next business day. Use existing facilities and verify every named responder can receive and act on alerts. [Incident response](incident-response.md)

Keep the old audit ledgers immutable. A separate human or independent reviewer rechecks unresolved and deferred work only within authorized, documented scope. Release evidence comes from reproducible receipts, provider/owner attestations and ordinary client tests. Store synthetic, operational, signed and hosted results with exact revisions and hashes. [Remaining risks](remaining-risk-register.md)
