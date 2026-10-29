# Guided practical-lab verification

Run from the isolated feature checkout. These commands do not load dotenv files.

```powershell
node --import tsx --test tests/labs/schema.test.ts tests/labs/transport.test.cjs
$env:LAB_TEST_PG_RUNTIME_ROOT = 'ABSOLUTE_PATH_TO_REVIEWED_POSTGRES_RUNTIME'
node tests/labs/integration.mjs
node tests/labs/browser.mjs
```

`LAB_TEST_PG_RUNTIME_ROOT` must contain `020-phase3-artifact-manifest-v1.json` and the retained `local-postgresql/distribution/pgsql` directory. The fixture validates recorded binary hashes, starts a new loopback cluster, uses generated synthetic credentials, and accepts only its own `harness_labs_*` databases. It never accepts a live database URL. Windows temporary-password ACLs and starting PostgreSQL can require execution outside the restricted sandbox.

The integration suite applies the selected committed Prisma schema baseline (`1a231cd0a10cb3c2bf733c04de17c01058ee300c`) followed by the additive lab migration. It tests an existing-data upgrade, a fresh owned database replay, runtime-role grants, real service transactions, object authorization, save conflicts, correction history, lost-response idempotency, notification rollback, provenance/linking races, reviewer pagination, and database constraints. Actor identity is injected at the test boundary; actual course/role/resource authorization and PostgreSQL are exercised.

The browser runner requires an existing production build at `apps/web/.next/BUILD_ID`. To build as part of its owned test run, set `LAB_E2E_BUILD=1`. It creates synthetic accounts, installs the reviewed database authentication boundary, starts the actual Next.js production application over loopback HTTPS, and runs the MySQL pilot through real cookie login, authoring, publication, student work, upload, correction, resubmission and grading. It also delays an actual attempt response to check reviewer-selection race handling. Browser outputs are retained under ignored `tmp/roster-import/labs-browser-*` directories.

Both suites use a **scanner wire-protocol fixture**, not an antivirus engine. They prove clean/rejected/unavailable verdict handling; they do not establish production scanning, signature freshness, staging deployment readiness, real MySQL execution, or physical-work authenticity. A real scanner and deployed-path smoke test remain release gates.
