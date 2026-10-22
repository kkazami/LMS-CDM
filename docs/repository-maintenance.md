# Repository maintenance

Keep application source, assets used by the app, workspace manifests, lockfiles,
Prisma schema/migrations, reproducible tests, and CI tools in the product repository.

The `.gitignore` excludes personal skills, memories, MCP/editor settings, generated
screenshots, temporary work, local database clusters, uploads, dependency stores,
environment files, and deployment credentials. Existing tracked copies must also
be removed with `git rm --cached`; ignoring them alone is insufficient.

The shared `.agents/agents`, `.agents/rules`, `AGENTS.md`, and `.orchestra/harness`
files are deliberate exceptions. They are required verification contracts and
fixtures, not personal skills or run history. Removing them breaks the existing CI
checks. The student-facing AI features inside `apps/web/src` are application code.

`node scripts/check-repository-files.mjs` checks the Git index and rejects local-only
files. CI runs the same check. It supplements credential review rather than proving
that arbitrary source text contains no secrets.

## Moving to another computer

Clone the product repository and install Node.js 22, pnpm 10.32.1, and the required
platform tools. Run `pnpm install`. Configure PostgreSQL and recreate the local
environment file from `.env.example`. Transfer actual credentials through a secure
channel, not either GitHub repository.

Restore personal AI skills and non-secret project context from the separate private
development backup. Reinstall Codex and its bundled plugins on the new computer;
account sessions, OAuth tokens, API keys, dependency folders, and generated outputs
are not portable source files and should not be committed.

Removing a file from the current Git tree does not remove it from old commits or
reduce the full historical clone size. A history rewrite is a separate operation
that affects other clones and branches; this cleanup does not rewrite history.
