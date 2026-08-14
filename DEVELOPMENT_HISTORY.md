# Development History

This document serves as a brief, chronological record of features, changes, and modifications implemented in this codebase.

---

## 2026-07-07

### Course Management & Enrollment System (Phases 1–4)

- **Database Schema Extension**: Added models for `Enrollment`, `SyllabusItem`, `StudentGroup`, `StudentGroupMember`, `SyllabusTargetGroup`, `Announcement`, and `PrivateComment` to `schema.prisma`.
- **Agentic Skills Layer**: Created composable server-side skills in `src/lib/skills/`:
  - `generateCourseCode`: Collision-safe alphanumeric join code generator.
  - `bulkAssignInstructor`: Atomic instructor course assignment.
  - `enrollmentManager`: Process student enrollment requests.
  - `flagSentiment`: Sentiment analysis check on private student comments.
  - `resolveGroupPermissions`: Group-permission content filtering.
- **Admin Course Management**: Added dashboard view and actions under `admin/courses/`.
- **Tabbed Course Interior**: Replaced default layout under `courses/[courseId]/` with a Google Classroom-inspired tabbed wrapper (Stream, Classwork, People).
- **Roster & Groups (People Tab)**: Renders instructor details, pending enrollment approval table, enrolled students, private messaging drawers, and student group creation/modification.
- **Stream & Classwork Accordion**: Built stream updates/announcements and category-filtered classwork accordions with group-permission gating.
- **Join Course Pipeline**: Created a Join Course modal allowing browse request mode and code entry mode for students.

---

## 2026-07-08

### Advanced Classwork, Grading & Dashboard Lifecycle (Phases 5–7)

- **Database Schema Extension**: Added models for `Attachment`, `StudentSubmission`, `SubmissionAttachment`, and `DashboardLayout` to `schema.prisma`. Added archiving support to `Course` (`isArchived`).
- **Assignment Attachments**: Extended classwork CRUD actions to parse and save instructor attachments (links and files) for assignments.
- **Student Submission Lifecycle**:
  - Added assignment detail subpage under `classwork/[itemId]/`.
  - Built `YourWorkPanel` sidebar for student link submissions with unsubmit actions, deadline tracking, and automatic interface locking after the due date.
- **Grading Interface**:
  - Created instructor submissions dashboard showing all student statuses.
  - Built `GradeEvaluationModal` for instructors to view submitted links/attachments and grade students with point limit checks.
- **Gradebook Grid & Export**:
  - Designed horizontal scroll matrix gradebook at `courses/[courseId]/gradebook/` showing all students × assignments with inline click-to-edit grades.
  - Implemented `gradebook-exporter` agentic skill to compile UTF-8 BOM CSV exports for Excel compatibility.
- **Dashboard Card Reordering & Menu**:
  - Ported card option dropdown menu for unenrolling (students) or archiving (instructors/admins).
  - Built Native HTML5 drag-and-drop card reordering in the dashboard with persistence in database order indices.
- **Archived Classes Route**: Designed greyed-out read-only archive listing at `courses/archived/` with restore options.

---

## 2026-08-11

### Flashcard UI/UX Overhaul

- **Flashcard Deck Deletion**: Added a delete action to the `DeckCard` component, allowing users to remove unwanted flashcard decks from their dashboard.
- **Dashboard Color Palette Refinement**: Overhauled the deck color selector, replacing low-contrast (yellow/pastel) and visually overlapping colors with a curated 9-color deep and high-contrast palette (including Deep Gold, Deep Rose, Deep Teal) for flawless readability on white cards.
- **Study Mode Layout Expansion**:
  - Widened the main study container to `max-w-5xl` and increased base height to `560px` for a much grander desktop experience.
  - Increased image attachment size limits to `360px` and bumped up the question text scale.
- **Dynamic 3D Card Overflow Fixes**:
  - Re-engineered the 3D flip-card layout using CSS Grid (`[grid-area:1/1]`) instead of absolute positioning, allowing the card to dynamically grow vertically to contain massive text blocks without overflowing bounds.
  - Implemented strict `break-words` wrapping to prevent long, unbroken strings from blowing out the horizontal layout.
# Development History

This document serves as a brief, chronological record of features, changes, and modifications implemented in this codebase.

---

## 2026-07-07

### Course Management & Enrollment System (Phases 1–4)

- **Database Schema Extension**: Added models for `Enrollment`, `SyllabusItem`, `StudentGroup`, `StudentGroupMember`, `SyllabusTargetGroup`, `Announcement`, and `PrivateComment` to `schema.prisma`.
- **Agentic Skills Layer**: Created composable server-side skills in `src/lib/skills/`:
  - `generateCourseCode`: Collision-safe alphanumeric join code generator.
  - `bulkAssignInstructor`: Atomic instructor course assignment.
  - `enrollmentManager`: Process student enrollment requests.
  - `flagSentiment`: Sentiment analysis check on private student comments.
  - `resolveGroupPermissions`: Group-permission content filtering.
- **Admin Course Management**: Added dashboard view and actions under `admin/courses/`.
- **Tabbed Course Interior**: Replaced default layout under `courses/[courseId]/` with a Google Classroom-inspired tabbed wrapper (Stream, Classwork, People).
- **Roster & Groups (People Tab)**: Renders instructor details, pending enrollment approval table, enrolled students, private messaging drawers, and student group creation/modification.
- **Stream & Classwork Accordion**: Built stream updates/announcements and category-filtered classwork accordions with group-permission gating.
- **Join Course Pipeline**: Created a Join Course modal allowing browse request mode and code entry mode for students.

---

## 2026-07-08

### Advanced Classwork, Grading & Dashboard Lifecycle (Phases 5–7)

- **Database Schema Extension**: Added models for `Attachment`, `StudentSubmission`, `SubmissionAttachment`, and `DashboardLayout` to `schema.prisma`. Added archiving support to `Course` (`isArchived`).
- **Assignment Attachments**: Extended classwork CRUD actions to parse and save instructor attachments (links and files) for assignments.
- **Student Submission Lifecycle**:
  - Added assignment detail subpage under `classwork/[itemId]/`.
  - Built `YourWorkPanel` sidebar for student link submissions with unsubmit actions, deadline tracking, and automatic interface locking after the due date.
- **Grading Interface**:
  - Created instructor submissions dashboard showing all student statuses.
  - Built `GradeEvaluationModal` for instructors to view submitted links/attachments and grade students with point limit checks.
- **Gradebook Grid & Export**:
  - Designed horizontal scroll matrix gradebook at `courses/[courseId]/gradebook/` showing all students × assignments with inline click-to-edit grades.
  - Implemented `gradebook-exporter` agentic skill to compile UTF-8 BOM CSV exports for Excel compatibility.
- **Dashboard Card Reordering & Menu**:
  - Ported card option dropdown menu for unenrolling (students) or archiving (instructors/admins).
  - Built Native HTML5 drag-and-drop card reordering in the dashboard with persistence in database order indices.
- **Archived Classes Route**: Designed greyed-out read-only archive listing at `courses/archived/` with restore options.

---

## 2026-08-11

### Flashcard UI/UX Overhaul

- **Flashcard Deck Deletion**: Added a delete action to the `DeckCard` component, allowing users to remove unwanted flashcard decks from their dashboard.
- **Dashboard Color Palette Refinement**: Overhauled the deck color selector, replacing low-contrast (yellow/pastel) and visually overlapping colors with a curated 9-color deep and high-contrast palette (including Deep Gold, Deep Rose, Deep Teal) for flawless readability on white cards.
- **Study Mode Layout Expansion**:
  - Widened the main study container to `max-w-5xl` and increased base height to `560px` for a much grander desktop experience.
  - Increased image attachment size limits to `360px` and bumped up the question text scale.
- **Dynamic 3D Card Overflow Fixes**:
  - Re-engineered the 3D flip-card layout using CSS Grid (`[grid-area:1/1]`) instead of absolute positioning, allowing the card to dynamically grow vertically to contain massive text blocks without overflowing bounds.
  - Implemented strict `break-words` wrapping to prevent long, unbroken strings from blowing out the horizontal layout.
- **Premium Answer Input**: Redesigned the study mode answer input from basic flex boxes into a sleek, pill-shaped container featuring a nested circular submit button, dynamic hover/focus states, and a glowing box-shadow that adopts the active deck's theme color while suppressing default browser focus rings.

### Learning Materials UI Overhaul

- **Interactive Document Viewer**: Built a custom PDF reading interface allowing students to highlight text and attach color-coded sticky notes, with all annotations saved to the database.
- **Study Sessions & Timer**: Implemented study session tracking and a focus timer to log the duration students spend reviewing course materials.
- **Collapsible Reading Workspaces**: Re-engineered the document viewer layout with collapsible sidebars for notes and focus mode, prioritizing screen space for reading while keeping tools accessible. Fixed Next.js SSR hydration errors related to `react-pdf` by wrapping the viewer in a dynamically imported client component.
- **Classwork Integration**: Refactored `SyllabusAccordion` and `AttachmentChip` so that clicking on a "Material" item or its file attachments anywhere in the classwork tab instantly routes students to the customized document reader instead of opening raw files.
- **Centralized Submissions Tracking**: Added a dedicated "Completed" bucket to the student To-do page, allowing students to verify their submitted assignments and quizzes in one unified dashboard without navigating into individual courses.
- **Theme Unification**: Removed subject-based course grouping in Learning Materials and standardized the hero banner gradients across the app to match the dashboard.
- **Universal Multi-Format Viewer**: Upgraded the Document Viewer to seamlessly support multiple file types beyond PDFs. Native support added for `.txt` and image files. Automatically embeds iframes for external Web/YouTube Links. Added smart routing for `.pptx`, `.docx`, and `.xlsx` files which proxies them to the Microsoft Office Embed Viewer (or provides a seamless download fallback during local development).
