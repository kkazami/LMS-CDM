# Period gradebooks

Instructors open **Gradebooks** in the sidebar to switch between their own classes without the course banner. Each class also retains its Gradebook tab and a link to the larger workspace. Expand gradebook uses the browser's full-screen view; Escape exits it.

Use **Assign periods** to place classwork in Midterm or Finals, individually or in batches. Explicit Midterm Exam and Final Exam categories default to their named period. Other existing and newly created classwork stays Unassigned until the instructor chooses a period. Titles and dates are never used to guess a period. Existing scores, submissions, lab review history, and category policies are preserved.

**Grading policy** defaults to Midterm 40% and Finals 60%, and permits another allocation totaling 100%. Each period can use total earned points divided by total possible points or its own category weights totaling 100%. The previous shared category policy is used until a period explicitly chooses another policy. Categories without classwork are excluded and the remaining weights are normalized. Categories present in classwork must appear in a weighted policy, including an explicit zero allocation when excluded.

Final Grade is calculated from the two period percentages, not by pooling their raw points. An 80% Midterm and 90% Finals produce 86% under 40/60. A period remains Pending until every item has a valid saved score; a missing score never becomes zero. Unassigned items block the Final Grade. A period with zero contribution does not need a total for the Final Grade. The existing Philippine grade-point conversion is applied to the resulting percentage. CSV exports use the same calculation and include every positive-point classwork category.

The additive migration `20261026100000_gradebook_periods` creates CourseGradebookPolicy and ClassworkGradingPeriod without updating existing academic records. `scripts/upgrade-gradebook-periods.mjs --apply` requires a separate local migration connection, a verified PostgreSQL binary directory, and a successful private backup before applying only that migration. It checks the migration checksum, preserves academic fingerprints, records the Prisma receipt, and verifies runtime grants. Missing period tables disable configuration writes while existing scores remain readable.

Verification commands:

```powershell
node --import tsx --test tests/gradebook/periods.test.ts
node tests/gradebook/integration.mjs
```

Integration requires LAB_TEST_PG_RUNTIME_ROOT pointing to the reviewed retained PostgreSQL distribution. The complete browser check runs through tests/labs/browser.mjs with LAB_E2E_BUILD=1, using a disposable loopback database and an isolated source copy. LAB_E2E_REAL_SCANNER=1 uses the real loopback scanner. LAB_E2E_LOW_RESOURCE=1 disables webpack caching and limits workers in that source copy only. Reports are stored beneath ignored tmp directories; no test uses live account credentials or modifies the configured LMS database.
