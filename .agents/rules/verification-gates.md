---
trigger: model_decision
description: Fresh evidence and independent review completion contracts
---
# Required gates
Contracts are enforced in scripts/harness/gates.ts and contracts.ts, not by checklist declarations.
Every stage has one owner and one active lease; required predecessor artifact hashes must match.
Every criterion traces requirement → task → named behavioral test → executed result → QA evidence.
No orphan requirements/tasks, removed criteria, skipped tests, empty suites or reused attempts.
Runner records run/attempt/stage, exact argv, HEAD/index/worktree fingerprint, environment digest,
timestamps, exit/signal/error, output hash and individual-test report. Test generation is not execution.
Changes invalidate validation/reviews. A repair reruns the entire approved command set and reviews.
QA reviews criteria and fresh executions; security reviews all server boundaries independently;
code review inspects the exact diff and resolves accepted architecture findings.
Only release aggregation may produce RELEASE_READY. COMPLETE requires separate deployment and
post-deploy gates. Expired/mismatched approvals or unresolved HIGH/CRITICAL findings block release.
harness:check proves static sensors only. harness:verify defaults to a completed release gate;
--allow-partial is diagnostic and never completion evidence. No run is a failure.
