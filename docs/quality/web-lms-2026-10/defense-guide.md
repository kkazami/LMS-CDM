# CdM LMS — defense guide and capacity explanation

Prepared: 21 October 2026. Audience: research panel, project team and school decision makers.

Scope: the web LMS, its Next.js backend and PostgreSQL database. Native mobile is excluded. This guide describes the tested local candidate, not a verified deployment of those changes to the main LMS.

## 1. The answer to remember

> “We evaluated the CdM LMS using six selected characteristics from ISO/IEC 25010:2023. The reviewed academic workflows, access controls and local recovery scenarios passed their specified checks. We also improved how large rosters and files are handled. However, we distinguish registered accounts from simultaneous activity. Our short local read-heavy test passed at 400 active clients and exceeded our response-time target at 1,000. We have not yet validated a representative 5,000-account dataset on the production hosting environment. Our conclusion is that the candidate is ready for further controlled evaluation, while institution-wide capacity and operational readiness remain subject to additional verification.”

Use the pattern **answer → evidence → boundary → next action**. Acknowledge an unknown directly; then explain how it will be measured. Readiness is a decision supported by evidence, not a promise that a system will never fail.

## 2. What the ISO basis means

ISO/IEC 25010:2023 supplies a product-quality model with nine characteristics. This study selects six. That is a scoped evaluation, not a complete assessment of the entire model. [Official ISO/IEC 25010:2023 abstract](https://www.iso.org/standard/78176.html).

The related measurement standard explains that rating levels depend on the product and user needs. The project must justify its own thresholds and rubric. [Official ISO/IEC 25023:2016 abstract](https://www.iso.org/standard/35747.html). It predates the 2023 model; citing it does not establish that we applied every measure or clause.

The following mapping is our plain-language operational interpretation for this LMS, not a reproduction of the standard's definitions.

| Selected characteristic | Question for the panel | LMS evidence to discuss |
|---|---|---|
| Functional suitability | Does it perform the required academic tasks correctly? | Submission, grading, enrollment and import results |
| Compatibility | Does it work with the supported browsers and connected systems? | Browser matrix and verified integration contracts |
| Interaction capability | Can intended users understand and operate it? | Navigation, keyboard behavior, errors and future user evaluation |
| Reliability | Does it preserve service and data, including when something fails? | Rollback, safe retries and recovery exercises |
| Security | Are access and changes restricted appropriately? | Role, institute, course, session and file checks |
| Performance efficiency | Does it respond acceptably within available resources and workload? | Latency, memory, storage, throughput and capacity tests |

Time, space and computational complexity help explain performance efficiency. Complexity analysis supports an explanation of growth; it is not, by itself, an ISO test result. Storage also affects reliability because larger backups can take longer to restore. Access restrictions can affect functional correctness as well as security.

**If asked, “Are you ISO certified?”**

> “No. We used the ISO quality model to organize our evaluation. We are not claiming ISO certification or that every characteristic and subcharacteristic has been independently assessed.”

The publicly available ISO abstracts establish the framework and measurement context. This guide is not a clause-by-clause conformance assessment of the full licensed standards.

## 3. The most important distinction: 5,000 accounts versus active users

Think of a school with 5,000 student records. Keeping those records is different from serving everyone at the registrar's counter at the same moment.

| Term | Simple meaning | Main capacity effect |
|---|---|---|
| Registered accounts | People with a stored identity in the system | Database records and long-term data growth |
| Signed-in sessions | People whose login remains valid | Session records; some may be inactive |
| Active users | People currently interacting with the LMS | Requests, processing and network traffic |
| Simultaneous requests | Operations being processed or waiting at one moment | Queues, connections and immediate resource pressure |
| Requests per second | How frequently operations arrive or finish | Workload rate; not the same as headcount |

**If asked, “Can your LMS support 5,000 users?”**

> “If you mean 5,000 registered accounts, that is our intended population, but we have not yet completed the corresponding dataset and production-environment validation. Account count alone does not determine speed. We must also consider their enrollments, submissions, files and peak activity. The current evidence demonstrates a successful 400-student import and a short 400-active-client local read workload. We do not present either result as proof of full 5,000-user operational capacity.”

**If asked, “But they will not all be online together—does that make it safe?”**

> “It reduces simultaneous demand, but it does not remove the need to test. Historical records still grow, and events such as deadlines and enrollment can create concentrated activity. We will size the deployment using both the total stored workload and the expected peak activity.”

For planning discussions only:

| Assumed active share of 5,000 accounts | Active users | Interpretation |
|---|---:|---|
| 2% | 100 | Illustrative light-use scenario |
| 5% | 250 | Illustrative intermediate scenario |
| 8% | 400 | Same headcount as the highest passing final short local workload |
| 20% | 1,000 | Same headcount as the failed final short local workload |

These percentages are arithmetic examples, not observed campus activity or forecasts. “400 out of 5,000” does not make a 400-client test equivalent to testing against 5,000 accounts and their history. We need representative population data as well as representative activity.

## 4. What the three sprints actually improved

| Sprint | Changes in everyday language | Quality areas supported |
|---|---|---|
| 1: Correct academic operations | Strengthened access checks in reviewed course workflows. Made related submission and grading changes succeed together or roll back together. Prevented repeated requests from awarding the same benefit again. Restricted attachment fetching. | Functional suitability, security, reliability |
| 2: Safer and more manageable use | Strengthened session expiry, password-change revocation, browser protections and private caching. Added protected new-upload handling. Divided large gradebooks into pages. Fixed selected keyboard, focus, login and recovery interactions. | Security, performance efficiency, interaction capability, compatibility |
| 3: Evidence and operations | Exercised real imports and local restoration. Added guarded load tools, dependency patches, CI definitions and operational procedures. Recorded capacity failures as well as successes. | Reliability, performance efficiency, security and evaluation traceability |

All three local implementation phases are complete. The remaining release checks belong to the third sprint's release gate. No deployment, live migration or production stress test was performed. Added CI workflows are not evidence of successful CI execution.

## 5. Evidence card: numbers you may quote

Always introduce these as **local candidate results**, unless the row explicitly says main-site observation.

| Evidence | Recorded result | What it does not establish |
|---|---|---|
| Automated product suite | 88 tests passed | Coverage of every LMS feature |
| Browser checks | 24 passed; Chromium, Firefox and Windows WebKit, including a narrow web viewport | Physical Safari testing or native mobile quality |
| Academic/security database scenarios | 17 passed | Production availability or a complete security audit |
| Actual student import | 400 identities in about 7.29 seconds, including preview/commit/replay measurement | Time to import 5,000 or production HTTP timing |
| Actual enrollment import | 2,000 enrollments across five courses in about 26.80 seconds | Unlimited bulk import or live-provider throughput |
| Roster-related database growth | About 4.56 MiB for the measured import/audit/index workload | Total semester storage or file storage per user |
| Gradebook fixture | All 40,000 grades preserved across eight pages for 400 students × 100 activities | A measured 5,000-account dataset |
| First gradebook page | About 90% smaller than the previous full-roster response shape | A 90% speed improvement across the whole system |
| Short read-heavy HTTP test, 400 clients | p95 about 1.41 s; p99 about 1.44 s; passed configured budgets | Sustained production or upload/deadline capacity |
| Short read-heavy HTTP test, 1,000 clients | p95 about 5.63 s; p99 about 7.30 s; failed latency budgets | A complete outage or a measured production ceiling |
| Local database restore | Matching data across 84 tables | Complete disaster recovery or a guaranteed recovery time |
| Main-site functional observation | Student, instructor and administrator views rendered | Deployment of the local fixes or live load capacity |

The final load runs lasted 20 seconds each, with a two-second ramp and two-second think time. They used distinct pre-provisioned sessions, primarily read requests and one in-flight request per simulated user. They did not represent 1,000 full browsers or a simultaneous login burst. The application, database and test generator shared a Windows workstation with a Ryzen 5 5600X and approximately 16 GiB RAM. An earlier 250-client diagnostic failed its latency target, while the final repetition passed; this variability reinforces the need for repeated controlled tests.

## 6. Panel questions about time

### Q1. “What do you mean by time efficiency?”

**ISO link: performance efficiency.**

> “We measure how long an operation takes under a stated workload. For a student, that may be opening classwork; for an administrator, importing a roster. We report these separately because a routine read and a bulk import perform different amounts of work.”

### Q2. “What does p95 of 1.41 seconds mean?”

> “In that specific test, approximately 95% of recorded requests completed within 1.41 seconds. Some took longer. It is not an average, and it does not mean every page becomes fully visible within that time. A browser also downloads and renders content.”

### Q3. “Why did you use two seconds as a target? Is that required by ISO?”

> “Two seconds at the 95th percentile is our proposed target for ordinary API operations. ISO supplies the quality framework, while the institution and study must justify suitable acceptance limits. Our proposed ordinary-API budgets also include five seconds at the 99th percentile and a failure rate below 1%, with checks per endpoint. They are project criteria, not universal ISO requirements.”

Heavy tasks need separately approved budgets. These thresholds still need institutional adoption; they must not be changed after seeing failures simply to obtain a passing result.

### Q4. “Did the system fail at 1,000 users?”

**ISO link: performance efficiency; reliability requires additional evidence.**

> “It failed our response-time target in the short local read workload. Requests still completed successfully, but users would have experienced longer waits. Successful responses do not cancel a performance failure. This result identifies a workload requiring further investigation; it does not establish a production failure point for every type of use.”

### Q5. “Can you multiply the 400-student import time to predict 5,000?”

> “We should not treat that multiplication as a reliable forecast. Larger datasets can change query costs, validation work and database waiting. The import is bounded and resumable, so we would process reviewed batches and measure total completion time against a representative 5,000-account dataset.”

The CSV batch cap is 500 rows. Confirmation processes at most 50 rows per call with a time budget. Importing accounts and sending activation emails are separate workloads; the local import did not send invitations.

### Q6. “What if everyone submits at the deadline?”

**ISO link: performance efficiency, reliability and functional suitability.**

> “A deadline is more demanding than reading a dashboard because the system must save submissions and may scan files. We strengthened safe retries and transaction handling, but the completed load test was primarily read-heavy. A separate deadline test must verify both response times and the exact saved submissions, grades and rewards before we claim deadline capacity.”

Proposed operational mitigations, pending school approval: stagger assessment deadlines where appropriate, publish submission guidance, monitor queues and rehearse incident handling. These do not substitute for adequate capacity or justify changing submission rules during an incident.

## 7. Panel questions about space

### Q7. “What does space mean in your evaluation?”

**ISO link: performance efficiency and reliability.**

> “We separate permanent storage from working memory. Storage holds accounts, grades, files and backups. Working memory is temporary space used while the server processes requests. Having enough disk storage does not mean the server has enough processing memory, and the reverse is also true.”

### Q8. “How much storage will 5,000 accounts require?”

> “We cannot give one measured total yet. The dominant factors are how many courses and submissions are retained, the sizes of uploaded files and how long backups are kept. Account records are only one component. We will budget records, files, database overhead, retained backups and growth headroom separately.”

Illustrative file-storage scenarios only; all sizes below use binary units:

| Assumed cumulative file usage per account | 5,000 accounts | Status |
|---|---:|---|
| 10 MiB | About 48.8 GiB | Planning arithmetic, not measured usage |
| 50 MiB | About 244.1 GiB | Planning arithmetic, not measured usage |
| 250 MiB | About 1,220.7 GiB, or 1.19 TiB | Everyone fills the current new-private-upload owner allowance |

These are file bytes alone. They exclude indexes, academic records, logs, backup copies and provider overhead. They do not mean capacity has been provisioned. The current new-private-upload allowance is owner-wide rather than a semester allocation, and does not bound all historical or other system data.

The approximately 4.56 MiB increase in the 400-student roster test included import/audit/index records and very little representative file content. It must not be used as a total-storage-per-student forecast.

### Q9. “Are uploads unlimited?”

**ISO link: security and performance efficiency.**

> “The local candidate limits the new private-upload path to 25 MiB per file and a 250 MiB owner allowance. It also restricts concurrent processing and attempts. These controls limit individual demand; they do not create an institution-wide storage budget. Hosting may impose a smaller request limit, which still requires deployment verification.”

New private asset bytes are currently stored in PostgreSQL. This means files also affect database size and backup/recovery cost. There are two active upload slots per warm process, not two across the whole deployment. Memory can contain additional file copies and parsing overhead. Historical public files still need a controlled migration.

### Q10. “Does every registered user consume server memory all the time?”

> “No. Stored account records do not require an application process for every account. Working memory depends more directly on active requests, returned data, file processing and background activity. We therefore measure memory under workload rather than multiplying one memory figure by all registered accounts.”

Observed app-process memory peaked near 785 MiB in the final 400-client run and 975 MiB at 1,000. These short observations exclude database and test-generator memory and do not prove long-term stability, absence of leaks or an appropriate hosting plan.

## 8. Panel questions about complexity

### Q11. “Explain complexity without programming terms.”

**ISO link: supporting analysis for performance efficiency.**

> “Complexity describes how the amount of work grows when the amount of data grows. Listing students grows with the number listed. Building a grade table grows with both the number of students and the number of activities. It helps us identify operations that can become expensive before users experience delays.”

### Q12. “What is the time and space complexity of the overall LMS?”

> “There is no single meaningful complexity formula for the entire LMS. Logging in, importing accounts, listing courses, uploading files and exporting grades perform different work. We describe the important operations separately and then measure their behavior together under a realistic workload.”

Technical follow-up, if requested:

| Operation | Defensible explanation from the reviewed implementation | Important qualification |
|---|---|---|
| Gradebook matrix construction | Core table construction grows as O(P × A), with P students on a page and A supported activities | Submission and attachment metadata add work; database filtering, counting, sorting and offsets have separate costs |
| Interactive gradebook page | P ≤ 50 and A ≤ 200; at most 10,000 student/activity cells in the core matrix | Limits bound this page's work, not total database cost or the entire LMS |
| Whole roster/export | Work and output increase with the full set of students, activities and included data | The shared SDK combines pages for its existing contract, so its client memory can still grow with the roster |
| CSV import | Guarded row processing, lookups and transactions repeat as rows increase | Some array/context searches can grow faster than linearly; no verified simple end-to-end O(N) claim |
| File inspection/storage | Work and working memory grow with accepted file bytes, approximately O(F) for straightforward byte processing | Scanner work, parser behavior, copies and network waiting add costs; this is not a bound on every document-processing feature |
| Database lookups | Declared indexes support selected access paths | We do not claim every query is O(log N); actual query plans, filters and returned rows matter |

Symbols describe source-level growth, not seconds. Big-O notation cannot prove a 5,000-account hosting capacity.

### Q13. “Why does pagination help?”

> “An instructor usually needs one manageable section of a gradebook at a time. We now return 50 students per page while retaining the supported activities. For the measured 400-student example, the first response was about 90% smaller. The remaining students were still available on the other pages.”

Do not say the database ignores all other rows. Counting, searching, ordering and later-page offsets can still become more expensive. Courses above 200 graded activities receive an explicit interactive-limit error rather than silently calculating incomplete grades; complete-export workflows need their own capacity validation.

### Q14. “What happens as 5,000 accounts accumulate years of records?”

> “We plan for related records, not just account count. For example, if 5,000 learners each have five course enrollments and 100 submitted activities in each course, that represents 25,000 enrollment relationships and up to 2.5 million submission records for that assumed period. This is an illustration, not our tested dataset. Multiple terms, attempts and files can increase it further.”

This scenario assumes all 5,000 accounts are learners and that each specified activity produces one submission. A real population includes different roles and completion patterns. Retention, archive and deletion policies require institutional decisions; no automated archival capability is implied.

## 9. Questions across the six quality areas

### Q15. “How do you know the system performs its academic functions correctly?”

**ISO link: functional suitability.**

> “We checked named workflows and their expected records, including submission, grading, import and safe retries. Tests verified results rather than only whether a page opened. For example, the gradebook fixture retained 40,000 grades across all eight pages. This supports those tested functions, while complete coverage of all LMS features remains outstanding.”

### Q16. “Can a student change someone else's grades or access another institute?”

**ISO link: security and functional suitability.**

> “The reviewed workflows enforce server-side role, institute, course and enrollment checks. We tested permitted and forbidden access. A hidden button alone is not considered protection. These results support the tested boundaries; they are not a guarantee that every unreviewed endpoint is secure.”

### Q17. “What if a student clicks Submit twice or the network retries?”

**ISO link: reliability and functional suitability.**

> “The reviewed submission flow recognizes repeated requests, and related database changes are handled together. Tests checked that retries do not produce unintended duplicate academic or reward effects. We still need the production-like deadline workload to establish how those protections behave under sustained pressure.”

### Q18. “Can you restore the system after a server failure?”

**ISO link: reliability.**

> “A local database backup was restored into a separate empty test database, and all 84 compared tables matched. That demonstrates the tested backup's data consistency. It does not yet prove institution-wide disaster recovery, because provider access, permissions, external services and switching the application back into service must also be rehearsed.”

The restore command took approximately 1.60 seconds on a small local fixture. Do not promise recovery in two seconds. Recovery Time Objective means the agreed maximum acceptable time to resume service; Recovery Point Objective means the agreed acceptable window of lost recent data. Neither objective has yet been adopted and validated for production.

### Q19. “Is the system secure because no dependency issues were found?”

**ISO link: security.**

> “The recorded scan found no advisories in its defined web/root production dependency scope after updates. That is one security check, not proof of complete security. Access controls, configuration, file handling, provider protections and future vulnerabilities still require monitoring and verification.”

The real malware-scanning engine and signatures remain unverified. The local candidate rejects new private uploads when scanning is unavailable. This protects the boundary but means upload availability depends on a correctly operating scanner. Old public uploads and the live site's more permissive script policy remain release concerns. Native mobile findings were outside this remediation scope.

### Q20. “Will it work on every browser?”

**ISO link: compatibility.**

> “The executed web checks passed in Chromium, Firefox and Windows WebKit. We report exactly that supported test matrix. We do not claim all devices or physical Safari testing, and native mobile work is a separate scope. Email, code execution and other real-provider integrations require their own verification.”

### Q21. “How did students rate its ease of use?”

**ISO link: interaction capability; respondent evaluation is a separate evidence stream.**

> “We have automated evidence for selected keyboard, focus, labeling, login and error-recovery behaviors. We do not yet have representative respondent ratings to report. We would ask students, instructors and administrators to complete defined tasks and record completion, errors, assistance and their feedback using the approved research instrument.”

Do not invent a sample size, satisfaction mean or verbal interpretation. Automated accessibility checks do not establish full accessibility or user satisfaction.

## 10. Hard questions about the score and study validity

### Q22. “You said 75 out of 100. Where did that come from?”

> “That was a provisional engineering judgment from the internal review, using equal weight for the six selected areas. It was not calculated from an approved research instrument, independent evaluation or ISO-prescribed scoring formula. We therefore do not present 75 as our study's measured quality result. Our defensible findings are the documented test outcomes and their stated limitations.”

For traceability, the informal component estimates were functional suitability 85, compatibility 80, interaction capability 75, reliability 70, security 75 and performance efficiency 65; their arithmetic mean is 75. The component values were judgments, not measurements. Do not label them “validated,” “unbiased” or “ISO compliant.”

### Q23. “Then how will you answer your research question about quality level?”

> “We will evaluate the six selected characteristics using a documented, approved method. Each reported level must identify its indicators, measurement procedure, participants where applicable, operating conditions and interpretation rules. We will present engineering results alongside user evaluation rather than convert the percentage of passing tests into a quality score.”

Before producing a formal level or numerical grade, the study needs:

1. An approved scope and operational indicators for each selected characteristic, with traceability to requirements.
2. Suitable measures and fixed interpretation rules, including the rationale for weights if an overall result is used.
3. A stated respondent and task-selection method for human evaluation, and records of the actual evaluation.
4. A representative dataset and deployment environment for technical measures.
5. Explicit treatment of failed, untested and not-applicable items. They cannot disappear from the denominator without explanation.
6. Review of the results and limitations. A strong average must not conceal a critical security or data-integrity release blocker.

If a five-point questionnaire is used, its interpretation bands and any conversion to percentages must be approved and reported. They are not supplied automatically by ISO/IEC 25010:2023. Do not claim statistical representativeness without the corresponding sampling method and data.

### Q24. “Can your own development team evaluate its own system fairly?”

> “Internal testing is valuable for finding and correcting defects, but it is not independent. We preserve failures, test conditions and evidence so another evaluator can examine the conclusions. For the research evaluation, representative users and independent review would strengthen credibility.”

### Q25. “If all your tests passed, why is it not ready for everyone?”

> “The functional regression checks passed, but the load experiments also recorded latency failures. Tests only support the scenarios they execute. We still need a representative 5,000-account workload, sustained production-like testing, provider verification, real scanning and recovery checks, user evaluation and deployment verification.”

Do not add the 88 tests, 24 browser checks and 17 database scenarios into a single quality percentage. They are different suites with different purposes and possible overlap.

### Q26. “Can buying a larger server solve the slowdown?”

**ISO link: performance efficiency and reliability.**

> “Possibly, but the correct action depends on the bottleneck. We need to identify whether requests are waiting for database connections, expensive queries, processing, scanning or another service. In our local comparison, increasing the connection pool from two to eight did not demonstrate improvement and failed a per-endpoint budget at 400 clients. We would measure first and then validate the change.”

Neither the default two connections nor the experimental eight is a validated production recommendation. Connection budgets must account for all application instances and the database provider's limits.

### Q27. “What happens if the internet or an external service fails?”

**ISO link: reliability, compatibility and interaction capability.**

> “The web LMS depends on connectivity. A browser message alone is not proof that a submission was saved; the server must confirm it. Safe retry handling helps in the reviewed flows. External code execution, email and scanning have separate dependencies, so their outages and recovery need dedicated tests and clear user messages. We do not claim full offline submission or guaranteed external-service uptime.”

## 11. Practical scenarios for the panel

| Scenario | Professional response | Needed evidence or control |
|---|---|---|
| 5,000 accounts, modest daily activity | “The population and its accumulated records must fit the storage and query workload; modest activity reduces immediate pressure.” | Representative 5,000-account/history fixture and provider metrics |
| 400 people reading at once | “The final short local read workload passed at this headcount; sustained production capacity remains unverified.” | Repeated 30–60 minute production-like test |
| 1,000 people reading at once | “The local run failed our latency target, so we cannot promise acceptable responsiveness.” | Bottleneck investigation and a new controlled test |
| Many people log in through one campus internet connection | “A shared public address can cause protective login limits to affect legitimate users.” | Campus-network login burst and calibrated limits without removing account protections |
| Many students upload large files together | “Files place different demands on memory, scanning, storage and hosting request limits.” | Real scanner, representative upload sizes, queue and provider measurements |
| Instructor exports a very large gradebook | “Export is a whole-data operation and needs a separate time and memory budget.” | Complete-export integrity and resource tests |
| Database fails during grading | “Related changes should roll back together; tested local scenarios support that behavior.” | Provider fault/recovery drill and reconciliation |
| Scanner is unavailable | “New private uploads fail safely, so the user needs a clear retry/support path.” | Real service monitoring, alerts and recovery procedure |
| Several semesters of files accumulate | “Storage and recovery requirements grow even without more concurrent users.” | Approved retention policy, measured growth and restore drills |
| Hosting becomes more expensive | “Costs depend on storage, traffic, database and service usage, not only accounts.” | Actual hosting plans, usage and billing limits; no cost guarantee yet |

## 12. Remaining work to validate the 5,000-plus-account objective

These are release acceptance activities, not additional completed results. Use isolated staging with synthetic records, never a stress test against the main LMS with real records.

| Work item | Accountable role | Completion evidence |
|---|---|---|
| Define population, roles, courses, term history, file usage and expected peak journeys; record a justified growth allowance beyond 5,000 | Project lead with school representatives | Approved workload assumptions and acceptance limits |
| Identify hosting, database, storage, scanner, email and code-execution limits | Deployment/operations owner | Recorded plans, resource ceilings, budgets and actual configuration |
| Build a synthetic dataset with at least 5,000 accounts and representative related records/files | Development/test owner | Fixture manifest, exact counts and integrity checks |
| Test staged imports and activation delivery separately | Development/test owner | Completion time, retry/resume results, no duplicates; sandbox email evidence |
| Run ordinary mixed workloads for 30–60 minutes, then separate login, deadline, upload and code-execution scenarios; spike and return to baseline | Performance test owner | Per-endpoint latency/error results, resource graphs, integrity checks and recovery observations |
| Verify real scanning, private-file migration and provider security controls | Security/operations owner | Recorded checks, residual findings and closure decisions |
| Adopt recovery objectives and conduct provider recovery/cutover drill | School service owner and operations | Agreed RTO/RPO and measured end-to-end recovery evidence |
| Conduct representative user tasks and independent review | Research/evaluation lead | Approved instrument, actual results and disclosed sampling limitations |
| Deploy the reviewed candidate and confirm behavior | Authorized release owner | Deployment identity, migrations/configuration verification, smoke checks and rollback readiness |

Named owners, dates and spending approvals still need assignment. This table is an ownership proposal, not a claim that those roles have accepted the work. Read-only peak testing and write-heavy scenarios require different acceptance evidence. Stop progression when a level fails; investigate rather than conceal failure behind an average.

## 13. Statements to use and statements to correct

| Avoid saying | Say instead |
|---|---|
| “The LMS is ISO certified.” | “The evaluation is organized around six selected ISO/IEC 25010:2023 characteristics.” |
| “The system passed ISO with 75%.” | “The 75/100 figure was an informal internal estimate, not our measured research result.” |
| “It can definitely handle 5,000 users.” | “5,000-plus accounts is the intended population; representative dataset and deployment validation are pending.” |
| “It supports 400 concurrent users.” | “The final 20-second local read-heavy simulation passed at 400 active HTTP clients.” |
| “All 1,000 users crashed the system.” | “The tested 1,000-client workload completed requests but failed the latency target.” |
| “Everything is constant time because it is paginated.” | “Pagination bounds the returned grade matrix; database and full-history work still grow.” |
| “We can restore the whole LMS in two seconds.” | “A small local database restored in about 1.60 seconds; full service recovery is unverified.” |
| “There are zero security vulnerabilities.” | “The recorded dependency scan found zero advisories in its stated scope; broader security verification remains.” |
| “Students rated the LMS highly.” | “Representative respondent results are not yet available.” |
| “All fixes are already on the website.” | “Local fixes are tested; their deployment has not been verified.” |

## 14. Suggested closing statement

> “Our evaluation shows concrete improvements in the reviewed academic workflows, access controls, bounded data handling and local recovery. The results also identify limitations, including unacceptable response times in the short 1,000-client test. For the intended population of more than 5,000 accounts, our responsibility is to validate both accumulated data and realistic peak activity on the actual hosting environment. We therefore recommend completing the stated acceptance checks before institution-wide rollout. This conclusion follows the selected quality framework and the evidence available, without treating untested conditions as passing results.”

## 15. Evidence and source index

The guide's measured results come from the local project evidence, not from ISO. Standards establish the evaluation context; the test records establish what this candidate did under the stated conditions.

- [Full quality evidence report](report.md) — method, environment, all six areas, load failures and release gates.
- [Sprint 1 results](../../../plans/019-sprint-1-results.md).
- [Sprint 2 results](../../../plans/019-sprint-2-results.md).
- [Sprint 3 results](../../../plans/019-sprint-3-results.md).
- [Operations and staging procedure](../sprint-3-operations.md).
- [Final load summary](../../../tmp/web-quality/final-load-summary.json).
- [Actual import and restoration report](../../../tmp/web-quality/sprint3-1792505045350/report.json).
- [Browser/build/load fixture report](../../../tmp/roster-import/sprint2-1792516549920/report.json).
- [Evidence index](../../../tmp/web-quality/sprint3-summary.json).
- [Gradebook implementation](../../../apps/web/src/lib/gradebook-data.ts) — page/interactive limits and matrix construction.
- [Private upload implementation](../../../apps/web/src/lib/private-upload.ts) — file limits and processing controls.
- [Roster import implementation](../../../apps/web/src/lib/roster/imports.ts) — guarded import processing.
- [Prisma schema](../../../prisma/schema.prisma) — relationships, uniqueness and declared indexes.
- [Official ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html).
- [Official ISO/IEC 25023:2016](https://www.iso.org/standard/35747.html).

The raw tmp evidence is ignored local output, not guaranteed to accompany a copied document or a repository checkout. Preserve a reviewed, sanitized evidence bundle before submitting this as a study appendix. Do not include passwords, session tokens, live connection strings or personal student records. This guide introduces no new test runs or measured results.
