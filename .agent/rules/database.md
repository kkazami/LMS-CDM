---
trigger: always_on
---

PostgreSQL and root prisma/schema.prisma are authoritative. Import { db } from @/lib/db using the pg adapter. Run pnpm prisma generate after schema edits and use transactions for multi-model writes.
Schema-changing harness runs require migration review, actual disposable-database application, fresh replay, existing upgrade, compatibility, data-preservation, post-schema and technically valid recovery evidence. Generation/build success is insufficient. Never rehearse against root live credentials. Destructive migration SQL raises risk to CRITICAL and requires explicit human approval.
