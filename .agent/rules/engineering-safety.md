---
trigger: model_decision
description: Mandatory engineering safety floor for every harness profile
---
- Use the v2 controller; never create PASS by editing state or declaring success.
- Requirements, recon/proposal, architecture attack and adjudication precede authoritative planning.
- Distinct creator, test author, QA, security, architecture and release sessions are mandatory.
- The host binds actor IDs to real sessions and enforces file/tool access. Prompts are not a sandbox.
- HIGH/CRITICAL plans (auth/RBAC, database, migrations, privacy, API boundaries, harness controls) require an externally signed human approval after planning. Production, secrets, destructive and bulk-data operations are CRITICAL.
- Approval is bound to exact reviewed artifacts; a new plan requires new approval.
- Never lower risk or remove criteria to pass. Profiles and skills cannot waive safety gates.
- Test author writes tests. Runner executes commands and captures evidence. QA inspects results.
- After repair, rerun ALL mandatory checks and all independent reviews. Maximum five repairs; three repeated identical failures escalate earlier.
- Direct server/API negative tests cover unauthenticated, wrong role/owner/institute/program, ID tampering, privilege escalation and data exposure. UI visibility is insufficient.
- Schema validation/build/generate do not prove migration safety. Rehearse fresh replay and existing upgrade on disposable local PostgreSQL, then check compatibility, preservation and recovery.
- Never use production test credentials. Only local harness_* disposable databases are permitted by the runner.
- Secrets, auth state and raw sensitive payloads do not enter agent context. Reports/logs are sanitized; human review must still check for unrecognized sensitive output.
- Deployment is separate, requires fresh release evidence and a new human approval, and never retries automatically after uncertain outcomes.
- User authorization takes precedence over workflow defaults. Record explicit authorization through the trusted host approval channel; do not fabricate it.
