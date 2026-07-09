# Development History

This document serves as a brief, chronological record of features, changes, and modifications implemented in this codebase.

---

## 2026-07-07
### Course Management & Enrollment System (Phases 1–4)
* **Database Schema Extension**: Added models for `Enrollment`, `SyllabusItem`, `StudentGroup`, `StudentGroupMember`, `SyllabusTargetGroup`, `Announcement`, and `PrivateComment` to `schema.prisma`.
* **Agentic Skills Layer**: Created composable server-side skills in `src/lib/skills/`:
  * `generateCourseCode`: Collision-safe alphanumeric join code generator.
  * `bulkAssignInstructor`: Atomic instructor course assignment.
  * `enrollmentManager`: Process student enrollment requests.
  * `flagSentiment`: Sentiment analysis check on private student comments.
  * `resolveGroupPermissions`: Group-permission content filtering.
* **Admin Course Management**: Added dashboard view and actions under `admin/courses/`.
* **Tabbed Course Interior**: Replaced default layout under `courses/[courseId]/` with a Google Classroom-inspired tabbed wrapper (Stream, Classwork, People).
* **Roster & Groups (People Tab)**: Renders instructor details, pending enrollment approval table, enrolled students, private messaging drawers, and student group creation/modification.
* **Stream & Classwork Accordion**: Built stream updates/announcements and category-filtered classwork accordions with group-permission gating.
* **Join Course Pipeline**: Created a Join Course modal allowing browse request mode and code entry mode for students.

---

## 2026-07-08
### Advanced Classwork, Grading & Dashboard Lifecycle (Phases 5–7)
* **Database Schema Extension**: Added models for `Attachment`, `StudentSubmission`, `SubmissionAttachment`, and `DashboardLayout` to `schema.prisma`. Added archiving support to `Course` (`isArchived`).
* **Assignment Attachments**: Extended classwork CRUD actions to parse and save instructor attachments (links and files) for assignments.
* **Student Submission Lifecycle**:
  * Added assignment detail subpage under `classwork/[itemId]/`.
  * Built `YourWorkPanel` sidebar for student link submissions with unsubmit actions, deadline tracking, and automatic interface locking after the due date.
* **Grading Interface**:
  * Created instructor submissions dashboard showing all student statuses.
  * Built `GradeEvaluationModal` for instructors to view submitted links/attachments and grade students with point limit checks.
* **Gradebook Grid & Export**:
  * Designed horizontal scroll matrix gradebook at `courses/[courseId]/gradebook/` showing all students × assignments with inline click-to-edit grades.
  * Implemented `gradebook-exporter` agentic skill to compile UTF-8 BOM CSV exports for Excel compatibility.
* **Dashboard Card Reordering & Menu**:
  * Ported card option dropdown menu for unenrolling (students) or archiving (instructors/admins).
  * Built Native HTML5 drag-and-drop card reordering in the dashboard with persistence in database order indices.
* **Archived Classes Route**: Designed greyed-out read-only archive listing at `courses/archived/` with restore options.
