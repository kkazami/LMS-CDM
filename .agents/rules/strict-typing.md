---
trigger: always_on
---

Use strict TypeScript and runtime validation at external boundaries; avoid any. Reuse generated Prisma types where appropriate and @lms/types for shared contracts. There is no packages/database in this repository; Prisma schema/client configuration lives at the root and apps/web uses the db singleton.
