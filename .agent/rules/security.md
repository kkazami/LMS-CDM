---
trigger: always_on
---

Middleware only checks cookie presence for pages and supplies headers for API requests; it does not authorize resources. Protected route handlers must validate sessions themselves using api-auth/auth-session, enforce RBAC and ownership/institute/program scope, and protect server actions too. Verify DB roles STUDENT, PROFESSOR/TEACHER, ADMIN against actual code. Independent security verification must test direct malicious/unauthenticated API requests; UI visibility is insufficient.
