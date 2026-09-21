---
trigger: model_decision
description: Engineering safety policies for the AI Software Engineering Harness
---
- Test Agent designs/writes tests. Test Runner executes them. These are SEPARATE roles.
- The Test Runner is deterministic infrastructure. It does NOT use an LLM to decide pass/fail. Exit code 0 = pass.
- Tests must be derived from requirements and expected user behavior, not from implementation details.
- After any repair, ALL mandatory verification re-runs.
- Repair loop bounded to 5 iterations. After 5: HUMAN_REVIEW_REQUIRED.
- High-risk changes (database migrations, auth/RBAC changes, production deployment) require human approval.
- Never commit credentials in test source. Use environment variables for E2E test credentials.
- Keep .auth/ state gitignored. Never use production credentials.
- Parallel test execution requires isolated test accounts/data.
- Browser error capture must include: console errors, page errors/uncaught exceptions, failed network requests, relevant request/response failures. Use allowlist for known noise.
