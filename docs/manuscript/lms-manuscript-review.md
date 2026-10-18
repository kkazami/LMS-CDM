# CdM LMS manuscript review

Reviewed 13 October 2026. This report reviews the complete pasted manuscript (approximately 14,541 words, excluding the separately supplied references) and the separately supplied reference list (73 entries, including duplicates). It does not rewrite the manuscript or authenticate every cited study. Diagram images were not embedded in the pasted text, so their current layout and contents require inspection in the assembled document. The earlier PDF is not assumed to represent the current diagrams.

Manuscript source: `C:/Users/kirby/.codex/attachments/eb04d277-52a1-4750-b3b5-0674fa8b41f6/Pasted text.txt`

References source: `C:/Users/kirby/.codex/attachments/b30951c4-0ba7-4429-821d-1360d0076704/Pasted text.txt`

## Overall assessment

The central project description is coherent: an ICS-focused LMS with complementary web, mobile, and desktop responsibilities; separate programming execution and repository workflows; academic oversight separated from teaching; and software-quality evaluation separated from claims about learning outcomes. The strongest sections are the problem statement, objectives, literature synthesis, and scope boundaries.

The draft needs targeted revision rather than a new conceptual direction. The highest-priority problems are a reference list that does not match the revised literature, outdated workflow explanations, missing analysis/testing procedures, and inconsistent statements about implementation status. Repetition is concentrated in the conceptual framework, feature inventory, and flowchart explanations.

## 1. Rebuild the reference list against the manuscript

### Missing author groups

The following 32 cited author/group names have no corresponding entry in the supplied list:

Abid; Acala and Dimasacat; Alfalah; Almodiel; Arada; Asuncion; Bach and Thiel; Benben and Bug-os; Bernardez; Dela Rosa; Fernandez-Gauna; Fojas; Francisco; Funa; Heikkinen; Jack; Kumi; McCombes; Mennuti; Messer; Moodle; Mudau and Van den Berg; Novak and Kermek; Orvalho; Oyarzun and Martin; Patani; Peralta; Purwanto; Quimod; Ramos; Schauer; Wiradarma.

This is an author-name reconciliation, not proof that these studies are invalid. Retrieve each original source and add its verified bibliographic details. Pan has an entry, but its year, authorship, and publication description require reconciliation with the in-text citation.

### Confirmed and visible problems

| Entry | Finding | Required action |
|---|---|---|
| ISO/IEC 25010:2023 | The URL ending in 78174 identifies ISO 16055:2021, a tobacco testing standard. The stated title also does not match the 2023 product-quality standard. | Use the official 78176 page and the title ending in *Product quality model*. |
| Guico | Body cites 2026; reference lists 2024. Publisher records publication on 6 January 2026, volume 14(1), pages 126-140. | Correct the entry and reconcile all in-text years. |
| Ramesh and Patel | Linked ERIC PDF is *Online Assessment in Higher Education: A Systematic Review* by Joana Heil and Dirk Ifenthaler, published in *Online Learning*, 27(1), 187-218 (2023). | Remove the incorrect attribution. Cite Heil and Ifenthaler only if their paper is actually used. |
| Jaramillo-Mediavilla | Two entries have different initials, titles, and journals. The identified systematic review is in *Education Sciences*, 14(6), 639, DOI 10.3390/educsci14060639. | Reconstruct one accurate entry from the original article; do not combine conflicting records. |
| Ahmed | Two near-identical titles are assigned different journals. The identified GMCLMS article is in *International Journal of Educational Technology in Higher Education*. | Retain the verified source record; investigate/remove the conflicting entry if it is meant to cite the same study. |
| Du | Two similar studies are listed with different titles/journals; the body does not clearly distinguish them. | Identify the precise paper used for the 69-student account; keep a second entry only if it is a distinct, verified, cited work. |
| Pan | Body cites Pan et al. (2023); list cites Pan alone (2022) and labels the publication GitHub Pages. The author's publication page identifies five authors and *Journal of Applied Research in Memory and Cognition*, DOI 10.1037/mac0000083. | Cite the scholarly publication. Resolve online-first versus issue year against the version used; keep body and reference consistent. |
| Zawacki-Richter | DOI resolves to a 2019 article, although the entry says 2022. It is not cited in the supplied revised manuscript. | Remove if uncited; otherwise correct year and full details. |
| IJETS / Rojas | Both use ETASR article 11772. The page identifies a bibliometric/thematic ISO/IEC 25010 paper by Rojas and coauthors, not the IJETS adaptive-learning title. | Correct or remove the mismatched IJETS entry; retrieve full authors/title for Rojas if used. |
| arXiv / Yu | Both link to arXiv 2510.03998 under different descriptions. The record is *TRACE: AI-Assisted Assessment of Collaborative Projects in Computer Science Education*. | Use the actual authors, exact title, and cited version; eliminate duplicate representations. |
| Marcial | The same entry appears twice. | Remove the exact duplicate; verify the remaining entry if it is retained. |

Platforms such as arXiv, PMC, ScienceDirect, and ACM Digital Library are not automatically the authors of papers hosted on them. Retrieve the actual authors where applicable. Corporate authors remain appropriate for genuinely institution-authored material such as official Moodle documentation.

Numerous reference entries are not cited in the supplied manuscript, including several local-journal entries and AI-related items. Remove unused entries under the required citation style after checking the entire assembled manuscript. Do not infer that an uncited or incomplete entry is fabricated; an original source must establish its identity.

Do not authenticate a source merely because its DOI resembles a valid DOI or because a plausible title appears in a reference list. Check authors, date, title, venue, sample, method, and findings against the original paper. Detailed numerical claims in Chapter 2 require the same checking.

Verification sources:

- [ISO/IEC 25010:2023](https://www.iso.org/standard/78176.html)
- [Guico publisher record](https://archive.conscientiabeam.com/index.php/73/article/view/4668)
- [Heil and Ifenthaler paper](https://files.eric.ed.gov/fulltext/EJ1382640.pdf)
- [Jaramillo-Mediavilla systematic review](https://www.mdpi.com/2227-7102/14/6/639)
- [Ahmed GMCLMS article](https://link.springer.com/article/10.1186/s41239-025-00541-1)
- [Pan author publication list](https://sc-pan.github.io/publications.html)
- [Zawacki-Richter 2019 article](https://link.springer.com/article/10.1186/s41239-019-0171-0)
- [ETASR article 11772](https://etasr.com/index.php/ETASR/article/view/11772)
- [TRACE arXiv record](https://arxiv.org/abs/2510.03998)

## 2. Replace the outdated Chapter 3 workflow explanations

### Student

- Section 3.8 says opening the login page causes the system to determine whether the student has an account. Replace this with a user choice to sign in or register; account lookup occurs after submission.
- It says a course code immediately enrolls the student. Current course actions create a pending request. Document validation, instructor approval/rejection, duplicate-request handling, and approved course access.
- Distinguish assigned coursework from personal tasks. The current To-Do/Tasks explanations do not clearly distinguish them.
- Include personal grades, notes/calendar, supported study tools, and distinct CodeLab/Git workflows, grouped where useful. Students do not gain the faculty directory or Super User supervision functions.
- Include return-to-dashboard and logout/session-expiry behavior.

### Instructor

- Remove the user-entered security pass-token unless the evaluated release has a separate implemented factor. The inspected login schema accepts email, password, and institute selection; session tokens are generated after login.
- Add calendar, faculty directory, course schedule/exception workflows, and the Program Head-only event-publication branch where included.
- Explain risk indicators as rule-based summaries of existing records, not predictions. Use Dynamic Gradebook consistently rather than introducing Integrated Grading Matrix as an unexplained second product name.
- Restrict course management, grades, and enrollment approval to authorized assigned courses.

### Administrator

- Begin with launching the native Administrator Console, not a generic public homepage.
- Replace the pass-token wording with the actual credential and role checks.
- Include protected Super User provisioning/revocation and applicable academic configuration.
- Describe audit-log review/filtering/export, rather than implying alteration of historical records.
- Claim backup, recovery, security, report, and moderation operations only where implemented and tested.

### Super User

Add a separate web workflow for authentication, validated institute selection, academic hub, faculty information, narrow leadership assignments, timetable inspection, restricted course supervision, shared events, personal notes/events, and logout. Do not route this role into grading, assessment participation, schedule editing, or Administrator tools.

Program Head is not Super User. An instructor's leadership designation does not grant the separate Super User supervision capability. Clarify this in respondent tasks and the Significance section.

The editable Student View diagrams already created in `docs/manuscript/student-flowchart/` can replace the outdated student overview. Their registration flow does not invent OTP or account approval; update it if those requirements are actually implemented.

## 3. Define implementation status and authentication coverage

The draft moves between proposed and implemented language. Section 1.8 says all listed features are implemented, while objectives and limitations still describe proposed coordination functions. Adopt a release/status matrix indicating implemented, planned, tested, and included-in-evaluation features. Development completion and formal evaluation are separate facts.

Suggested Section 1.8 opening:

> CdM LMS comprises complementary Web, Mobile, and Desktop applications connected through shared backend services and a centralized database. The following feature groups describe the study's intended coverage for Student, Instructor, Super User, and Administrator roles. Implementation status and inclusion in the evaluated release will be recorded separately.

Objectives and features repeatedly promise verified and approved accounts. Account verification, registration approval, account activation, and course enrollment approval are separate processes. Document which are implemented, who performs them, and when access is granted. Do not claim OTP/registration approval based solely on the pending course-enrollment model.

The inspected registration handler creates an account directly, and the login handler checks credentials and active status. The broader verification/registration-approval claim requires a separate demonstrated workflow. Keep it as a development requirement if intended; do not silently convert it into a completed fact.

## 4. Complete Chapter 3's evaluation procedures

### Research design

Section 3.1 introduces surveys, but the study also develops a system and conducts technical verification. Describe all three activities without automatically relabeling the study experimental or mixed-methods.

Suggested opening:

> The study will involve iterative system development, requirements-based technical testing, and quantitative descriptive evaluation. Role-appropriate questionnaires will describe respondents' experiences, while controlled technical checks will examine correctness, access restrictions, record consistency, performance, and integration. The two forms of evidence will be reported separately and interpreted together.

### Requirements gathering

Planning promises local requirements gathering, but Chapter 3 does not specify how it will happen. State the planned participants, method, topics, recording approach, and how findings become requirements. Keep pre-development requirements gathering distinct from post-development evaluation questionnaires.

### Respondents and task assignment

Identify target numbers and recruitment procedures for each group before evaluation, with a rationale appropriate to purposive sampling. No arbitrary new sample size is supplied by this review. Retain the distinction between questionnaire validators and evaluation respondents.

Map evaluation tasks to account roles and platforms. Ordinary instructors evaluate teaching functions; Program Heads evaluate designation-specific communication; qualified experts can use controlled Super User and Administrator accounts. An academic designation alone does not authorize Super User tasks. Record the accounts and datasets used for each technical check.

### Analysis / statistical treatment

Add a section specifying response coding, frequencies/percentages, the chosen item and characteristic summaries, interpretation rules, group reporting, missing-response handling, and how technical findings are reported. N/A must not be coded as zero or disagreement. Report valid response counts, since different roles observe different functions. State how student, instructor, and expert results will be kept separate or combined; do not pool unlike questionnaires without justification.

If means are used, explain their calculation and weighting. If using a frequency-weighted mean of response codes, distinguish that from assigning different importance weights to characteristics or respondent groups. Avoid inventing interpretation bands without an approved rationale.

### Technical verification plan

| Selected characteristic | Example evidence to define |
|---|---|
| Functional Suitability | Expected-versus-actual grade, submission, schedule, and conversion outputs |
| Interaction Capability | Role-appropriate task completion and questionnaire feedback |
| Security | Direct prohibited read/write attempts and private-record isolation |
| Performance Efficiency | Timings and resource observations under a recorded workload |
| Reliability | Interrupted-request/retry tests, persistence, duplicate/stale-save handling |
| Compatibility | Shared-record checks across clients and Administrator Console co-existence checks |

For each test, record setup, data, role, action, expected outcome, repetitions where appropriate, observations, and acceptance criteria. These checks are proposed procedures, not completed results or ISO certification.

### Participant/data protection

Consent is already mentioned. Add how recruitment avoids pressure, participation/withdrawal is handled, evaluation identifiers are coded, records are accessed and retained, and test accounts/data protect real academic information. Record applicable institutional permission rather than claiming it is already obtained.

## 5. Tighten Chapter 1 without removing necessary boundaries

- **Background:** Approximately 657 words; reasonable. Keep international/local evidence brief and the local problem evidence-based. Check precise sample sizes and outcomes against the originals.
- **Problem statement:** Keep the six characteristic questions. Replace vague "What is the level of the LMS" with "How is the software quality of CdM LMS evaluated in terms of..." or specify the ratings and technical evidence used. Engagement questionnaire items should concern observed interaction, not proven long-term motivation.
- **Objectives:** Ten can fit the project's scope; do not cut merely to match another capstone. Remove redundant "proposed" from objective 7 if the whole objective is future-facing. Retain verifiable outcomes and distinguish requirements from results.
- **Conceptual framework:** Approximately 967 words. The detailed six-phase description duplicates the Operational Framework. Condense it to Input, Process, Output, and Feedback in about 450-650 words; keep the appropriate citations.
- **Operational framework:** Approximately 583 words. The current shortened version is reasonable. Do not restore the full feature lists.
- **Scope:** Approximately 942 words. Summarize participant groups here; keep full eligibility/recruitment detail in Chapter 3. Preserve institute boundaries, platform responsibilities, and important exclusions.
- **Significance:** Use intended benefits and expected contribution consistently. Do not conflate Program Head coordination with Super User supervision.
- **Features:** Approximately 1,326 words. The same functions appear under Core Features, User Features, Cross-Platform Foundations, Technology Integration, and Unique Features. Use one feature inventory plus one role/platform matrix. A short ICS integration paragraph can replace the repeated innovation list.
- **Definitions:** Generally useful. Define Dean, BSIT, and BSCpE if needed at first use; remove terms not used substantially. Rename "Spaced-Repetition-Oriented Review" to "Flashcard Review" if no actual review scheduling mechanism is documented. Describe known behavior rather than embedding "without assuming an unverified algorithm" in an operational definition.

EXP, reputation, and grades can remain separate measures while a specifically approved incentive affects grades. Clarify any implemented link; otherwise exclude grade incentives from the evaluated feature set until the rule and institutional authorization are established.

## 6. Improve Chapter 2's structure and connection to the expansion

The seven topic groups and synthesis are broadly appropriate. Keep comparisons of methods, findings, limits, and relevance. Avoid repeating the full web/mobile/desktop role description at the end of several literature sections.

Faculty coordination is mentioned in the course-management discussion, but support for the oversight and schedule expansion is less developed than support for the learning modules. Add a concise synthesis using verified sources on academic coordination, faculty responsibilities, access boundaries, and institutional LMS support. Do not claim those sources validate the exact database or scheduling algorithm, and do not add papers merely to fill a quota.

Remove phrases such as "these five studies" and "the standard is not one of the five studies counted" unless the adviser explicitly requires a numerical quota. They describe writing administration rather than scholarly synthesis. Section 2.1.2 already discusses six studies.

Add the missing 2.1 parent heading. There is no 2.4 section: either renumber Synthesis to 2.4 and Research Gap to 2.5, or populate the required 2.4 section if the institutional template expects one.

Split the Research Gap into three short paragraphs (integration; coordination/access boundaries; complementary platforms). The contextual/evaluative framing is appropriate. Avoid suggesting that lack of a study at one institution alone proves a general scientific novelty.

## 7. Requirements and document assembly

- Keep hardware figures labeled estimates. The current hardware section lacks hosting/storage/network sizing even though the application depends on those services. Include a short proposed deployment table or refer to an appendix describing the selected managed hosting resources and quotas.
- The browser row says Firefox/Safari "were included" despite future-facing evaluation. Use "will be tested where included in the evaluation scope" unless results establish their inclusion; record exact versions.
- Distinguish development OS support, browser OS support, and successfully packaged mobile/desktop builds. Add the final client OS/build matrix before evaluation.
- Put exact dependency versions in a dated release-configuration record. The main manuscript can use major framework versions if the template permits; keep exact versions attributable to the evaluated release.
- Fill table-number placeholders. Use one approved project title consistently; earlier instructions used "A Multi-Platform...", while this paste omits that wording.
- Review the cover date (May 2026) against the actual submission/revision date and the publication dates/versions of cited sources. A 2026 source is not automatically inconsistent; the actual month/version matters.
- Fix the Figure 1 caption ending "IPO Model:P". Suggested caption: "Conceptual Framework of CdM LMS Using the IPO Model with Feedback."
- Use "Review of Related Literature" unless the institutional template requires another heading. Standardize "Objectives of the Study," BSCpE, Administrator, Dynamic Gradebook, and course/class terminology.
- Define a course versus a class/section if both words identify different records. Otherwise use one term consistently in narration while retaining actual UI labels where useful.
- Expand ERD and DFD sections with figures, readable captions, and concise explanations aligned to the actual schema/workflows. A pasted placeholder does not establish that the figure is missing from Word.
- Remove sentences saying a diagram "fails to indicate" logout. Correct the diagram, then describe the finished workflow; do not leave review commentary inside the manuscript.

## 8. Suggested shortening targets

These are editorial targets, not institutional rules.

| Section | Current approximate words | Suggested treatment |
|---|---:|---|
| Conceptual Framework | 967 | About 450-650; move phase detail to Operational Framework |
| Operational Framework | 583 | Keep approximately this length |
| Scope and Limitations | 942 | About 600-750; relocate detailed respondent criteria |
| General Features | 1,326 | About 800-1,000 plus one role/platform matrix |
| Chapter 2 | 3,820 | Retain substantive synthesis; trim repeated project descriptions |
| Flowchart explanations | 1,920 | About 800-1,200 across four roles, with detailed subflows where needed |

The largest safe reductions come from duplicated descriptions, not from eliminating boundaries that affect permissions, evaluation, or research scope.

## Recommended revision order

1. Reconcile sources and references; correct confirmed attribution/link errors.
2. Fix authentication and enrollment narration; add Super User workflows and test accounts.
3. Add analysis, technical-testing, requirements-gathering, and participant-protection procedures.
4. Establish feature/release status and resolve verification/approval promises.
5. Update actual diagrams, role/platform mapping, and requirements records.
6. Consolidate repetitive feature/framework/flowchart prose.
7. Finish title, numbering, terminology, captions, and final reference formatting.

No source code, migrations, or original manuscript/reference attachments were modified by this review.
