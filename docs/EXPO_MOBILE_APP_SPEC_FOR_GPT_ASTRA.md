# LUMINA LMS — EXPO MOBILE APPLICATION COMPREHENSIVE SPECIFICATION & CONTEXT DOSSIER FOR GPT ASTRA

> **Purpose of this Document**: This document contains all architectural context, data models, API endpoints, design systems, and feature specifications required by **GPT Astra** to formulate a detailed, production-ready, step-by-step implementation plan for the **Lumina LMS Expo Mobile Application (`apps/mobile`)**.
>
> **Target Roles**: **Student View** and **Instructor / Professor View** ONLY. *(The Administrator View is strictly web/desktop only and MUST NOT be included in this mobile application).*
>
> **Core Mandate**: Build a **100% native, standalone Expo application**. **DO NOT** use WebView wrappers or shortcuts for standard LMS views. The mobile app must have a rock-solid foundation, touch-first responsive design, haptic feedback, safe area compliance, offline resilience, and dynamic multi-institute theming.

---

## TABLE OF CONTENTS
1. [Monorepo Architecture & Technology Stack](#1-monorepo-architecture--technology-stack)
2. [Authentication, Session Protocol & Security](#2-authentication-session-protocol--security)
3. [Multi-Institute Identity & Dynamic Theming System](#3-multi-institute-identity--dynamic-theming-system)
4. [Database Schema & Domain Models (Prisma Reference)](#4-database-schema--domain-models-prisma-reference)
5. [Complete REST API Catalog & Data Contracts](#5-complete-rest-api-catalog--data-contracts)
6. [Exhaustive Feature Specification: Student View](#6-exhaustive-feature-specification-student-view)
7. [Exhaustive Feature Specification: Instructor / Professor View](#7-exhaustive-feature-specification-instructor--professor-view)
8. [Simulations & Interactive Activities Strategy](#8-simulations--interactive-activities-strategy)
9. [Mobile Responsiveness, Touch Ergonomics & Accessibility](#9-mobile-responsiveness-touch-ergonomics--accessibility)
10. [Target Expo Router Architecture & Directory Tree](#10-target-expo-router-architecture--directory-tree)
11. [Prompt & Planning Guidelines for GPT Astra](#11-prompt--planning-guidelines-for-gpt-astra)

---

## 1. MONOREPO ARCHITECTURE & TECHNOLOGY STACK

### 1.1 Repo Shape & Workspace Structure
The project is organized as a Turborepo monorepo using `pnpm` (`pnpm@10.32.1`):
```text
lms-monorepo-skeleton/
├── apps/
│   ├── web/            # Next.js 16 App Router (The sole backend and web dashboard)
│   ├── mobile/         # Expo SDK 55 / React Native app (Target of this specification)
│   ├── desktop/        # Electron app (Wraps web dashboard)
│   └── api/            # Empty placeholder (DO NOT add logic here; backend is in apps/web)
├── packages/
│   ├── api-client/     # Universal HTTP client with Bearer auth token injection
│   ├── types/          # Shared TypeScript interfaces for all LMS domain models
│   ├── config/         # Shared Tailwind and TypeScript base configs
│   ├── utils/          # Shared helper functions
│   └── ui/             # Unused atomic UI package (Web keeps its own in apps/web/src/components)
├── prisma/
│   ├── schema.prisma   # Single source of truth for PostgreSQL database schema
│   └── seed.ts         # Database seed scripts
└── docs/               # Technical specs and architecture docs
```

### 1.2 Mobile Technology Stack (`apps/mobile`)
- **Framework**: Expo SDK 55 (`~55.0.31`) with React Native 0.83.10 and React 19.2.0.
- **Routing**: Expo Router `~55.0.18` (File-based routing using directory groups).
- **Data Fetching & Server Cache**: TanStack React Query (`@tanstack/react-query` `^5.102.8`).
- **Global State Management**: Zustand (`^5.0.14`).
- **Icons**: `lucide-react-native` (`^0.468.0`).
- **Toasts & Feedback**: `burnt` (`^0.13.0`) for native toast alerts; `expo-haptics` (`^55.0.18`) for touch haptics.
- **Security & Storage**: `expo-secure-store` (`~55.0.18`) for auth tokens and user preferences.
- **Hardware & Device Integrations**:
  - `expo-document-picker` & `expo-image-picker`: Assignment file uploads and profile avatar changing.
  - `expo-file-system` & `expo-sharing`: Downloading learning materials, lecture slides, and submission attachments.
  - `expo-notifications`: Push alerts for assignment due dates, grades returned, and announcements.
  - `@react-native-community/netinfo`: Real-time network detection and offline indicators.
  - `expo-local-authentication`: Biometric authentication (FaceID / Fingerprint) for quick login.
- **Animations & Gestures**: `react-native-reanimated` (`4.2.1`) and `react-native-gesture-handler` (`~2.30.0`).

### 1.3 Strict Architectural Boundaries
- **Next.js Web App is the ONLY Backend**: All API endpoints run inside `apps/web/src/app/api/...`. The mobile app **must never** attempt direct database access.
- **Shared Packages Usage**:
  - Mobile consumes `@lms/types` (workspace:*) for TypeScript interfaces.
  - Mobile consumes `@lms/api-client` (workspace:*) or an enhanced wrapper for all HTTP communications.
  - Mobile components are 100% native React Native components (`View`, `Text`, `Pressable`, `ScrollView`, `FlatList`), **NOT** `@lms/ui` or HTML DOM elements.

---

## 2. AUTHENTICATION, SESSION PROTOCOL & SECURITY

### 2.1 Authentication Flow
1. **User Login**: The user provides `email`, `password`, and optional `instituteCode` (`ics`, `ibe`, `ite`).
2. **Backend Validation**: `POST /api/auth/login` checks credentials via `bcryptjs`, verifies the user is active, ensures the user is accessing their assigned institute, and creates a database `Session` record with a 7-day expiration.
3. **Daily Login Rewards**: If the logging-in user is a `STUDENT`, the backend automatically processes their daily login streak and awards EXP.
4. **Token Generation**: The API returns:
   ```json
   {
     "message": "Login successful.",
     "token": "cuid_session_id_string",
     "user": {
       "id": "user_id",
       "name": "Kirby Dela Cruz",
       "email": "student@student.ph",
       "role": "STUDENT",
       "studentNumber": "24-101",
       "institute": {
         "code": "ics",
         "name": "Institute of Computing Studies"
       }
     }
   }
   ```
5. **Secure Storage**: Mobile stores `token` in `expo-secure-store` under the key `lumina_auth_token`, and the serialized user profile under `lumina_user`.
6. **Request Interception**: Every HTTP request made by `@lms/api-client` injects the bearer token:
   ```http
   Authorization: Bearer cuid_session_id_string
   ```
7. **Backend Authentication Handler**: `apps/web/src/lib/api-auth.ts` intercepts both cookies (for web) and `Authorization: Bearer <token>` (for mobile) using `getSessionFromRequest(request)`.

### 2.2 Host Resolution in Development
Physical mobile devices and emulators connect dynamically to the development server. `apps/mobile/src/lib/constants.ts` handles:
- Dynamic detection of Metro packager IP (Wi-Fi LAN IP `http://192.168.x.x:3000`).
- Android Emulator alias `http://10.0.2.2:3000`.
- Custom user override saved in SecureStore (`lumina_custom_api_url`) for custom tunneling / staging deployments.

### 2.3 Roles & Permissions
- **`STUDENT`**: Enrolled in courses, submits assignments, reviews flashcards, earns EXP, tracks personal grades.
- **`PROFESSOR` / `TEACHER`**: Instructs courses, creates classwork, reviews and grades student submissions, sends broadcast alerts, views telemetry on at-risk students.
- **`ADMIN`**: Excluded from mobile application.

---

## 3. MULTI-INSTITUTE IDENTITY & DYNAMIC THEMING SYSTEM

Lumina LMS is institute-differentiated. The mobile app UI dynamically inherits the user's institute palette, supporting both **Light Mode** and **Dark Mode**.

### 3.1 Institute Palettes (`apps/mobile/src/lib/theme.ts`)

| Institute | Code | Light Primary | Dark Primary | Sidebar/Card Dark | Identity & Focus |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Institute of Computing Studies** | `ics` | `#FF7517` (High-Energy Orange) | `#FF8A3D` | `#12151E` / `#1A1E29` | Technology, Algorithms, Systems |
| **Institute of Business & Entrepreneurship** | `ibe` | `#D4A017` (Executive Amber/Gold) | `#E5B73B` | `#12151E` / `#1A1E29` | Leadership, Management, Finance |
| **Institute of Teacher Education** | `ite` | `#2563EB` (Pedagogical Blue) | `#3B82F6` | `#12151E` / `#1A1E29` | Pedagogy, Instruction, Research |

### 3.2 Semantic Status Colors
- **Success**: `#10B981` (Emerald)
- **Warning**: `#F59E0B` (Amber)
- **Danger / Destructive**: `#EF4444` (Red)
- **Info / Neutral**: `#3B82F6` (Blue)

### 3.3 Theme Resolution & State
- `useThemeStore` (Zustand + `expo-secure-store`) manages user preference: `'system' | 'light' | 'dark'`.
- `getInstituteTheme(instituteCode, isDark)` delivers the active color tokens to components.
- The interface must seamlessly support system appearance changes (`Appearance.addChangeListener`).

---

## 4. DATABASE SCHEMA & DOMAIN MODELS (PRISMA REFERENCE)

The mobile app models directly mirror the root Prisma schema (`prisma/schema.prisma`):

```mermaid
erDiagram
    Institute ||--o{ User : "has members"
    Institute ||--o{ Course : "hosts"
    User ||--o{ Enrollment : "enrolls in"
    Course ||--o{ Enrollment : "has students"
    Course ||--o{ SyllabusItem : "contains"
    SyllabusItem ||--o{ StudentSubmission : "receives"
    StudentSubmission ||--o{ SubmissionAttachment : "has files"
    SyllabusItem ||--o{ Attachment : "provides materials"
    Course ||--o{ Announcement : "publishes"
    Course ||--o{ NotificationBroadcast : "broadcasts"
    User ||--o{ Notification : "receives"
    User ||--o| GamificationProfile : "tracks EXP & streaks"
    GamificationProfile ||--o{ StudentBadge : "earns"
    Course ||--o{ FlashcardDeck : "has study decks"
    FlashcardDeck ||--o{ Flashcard : "contains cards"
    Flashcard ||--o{ FlashcardProgress : "tracks mastery"
    User ||--o{ TaskItem : "manages todos"
    Course ||--o{ GradeIncentiveRule : "defines bonus EXP"
```

### 4.1 Key Entity Breakdown
- **User**: `id`, `name`, `email`, `role`, `studentNumber` (regex `/^\d{2}-\d{3}$/`), `avatarUrl`, `bio`, `phone`, `department`, `yearLevel`, `coverColor`, `instituteId`.
- **Course**: `id`, `code`, `courseCode`, `title`, `section`, `subject`, `room`, `description`, `coverImage`, `instructorId`, `instituteId`, `isArchived`.
- **Enrollment**: `id`, `courseId`, `studentId`, `status` (`PENDING` | `APPROVED` | `REJECTED`), `displayOrderIndex`.
- **SyllabusItem**: `id`, `courseId`, `type` (`ASSIGNMENT` | `QUIZ` | `MATERIAL` | `EXAM`), `title`, `description`, `dueDate`, `maxPoints`, `orderIndex`.
- **StudentSubmission**: `id`, `syllabusItemId`, `studentId`, `status` (`DRAFT` | `SUBMITTED` | `GRADED` | `RETURNED` | `MISSING`), `grade` (Float), `isReturned`, `submittedAt`.
- **SubmissionAttachment**: `id`, `submissionId`, `type` (`FILE` | `LINK`), `url`, `fileName`.
- **Announcement**: `id`, `courseId`, `authorId`, `content`, `createdAt`.
- **NotificationBroadcast**: `id`, `courseId`, `senderId`, `message`, `category` (`GENERAL` | `REMINDER` | `ALERT`), `recipientCount`, `createdAt`.
- **GamificationProfile**: `studentId`, `exp`, `level`, `levelTier`, `currentStreak`, `longestStreak`, `lastLoginDate`, `loginStreakCurrent`, `isLeaderboardAnonymized`.
- **StudentBadge**: `profileId`, `badgeRuleId`, `earnedAt`, `isNew`.
- **FlashcardDeck**: `id`, `title`, `description`, `tags`, `color`, `courseId`, `creatorId`, `instituteId`.
- **Flashcard**: `id`, `deckId`, `front`, `back`, `hint`, `attachments`, `orderIndex`.
- **FlashcardProgress**: `cardId`, `userId`, `status` (`unseen` | `correct` | `incorrect`), `attemptCount`, `correctCount`.
- **TaskItem**: `id`, `title`, `description`, `priority` (`low` | `medium` | `high`), `dueDate`, `courseId`, `completed`, `creatorId`.
- **GradeIncentiveRule**: `id`, `courseId`, `createdBy`, `label`, `gradeMin`, `bonusExp`, `isActive`.

---

## 5. COMPLETE REST API CATALOG & DATA CONTRACTS

All endpoints accept `Authorization: Bearer <session_id>` header.

### 5.1 Authentication (`/api/auth`)
- **`POST /api/auth/login`**: Authenticates user.
  - Body: `{ email: string, password: string, instituteCode?: string }`
  - Returns: `{ message: string, token: string, user: AuthUser }`
- **`POST /api/auth/register`**: Registers student account.
  - Body: `{ name: string, email: string, studentNumber: string, password: string, confirmPassword: string, instituteCode: string }`
  - Returns: `{ message: string, user: AuthUser }`
- **`GET /api/auth/me`**: Validates current session. Returns `{ user: AuthUser }`.
- **`POST /api/auth/refresh`**: Refreshes session expiry. Returns `{ success: true, expiresAt: string }`.
- **`POST /api/auth/logout`**: Invalidates session from database.

### 5.2 Courses & Interior Hub (`/api/courses`)
- **`GET /api/courses?institute=ics`**: Returns courses enrolled by student, or taught by instructor.
  - Response: `{ courses: Course[], pagination: { page, limit, totalCount } }`
- **`GET /api/courses/[courseId]`**: Full course metadata and overview.
- **`GET /api/courses/[courseId]/stream`**: Stream feed with announcements and broadcast alerts.
  - Response: `{ announcements: CourseAnnouncementItem[], broadcasts: CourseBroadcastItem[] }`
- **`POST /api/courses/[courseId]/stream`**: Post class announcement (Instructor only).
  - Body: `{ content: string }`
- **`GET /api/courses/[courseId]/classwork`**: Categorized syllabus items with student's personal submission status.
  - Response:
    ```json
    {
      "items": [
        {
          "id": "item_123",
          "type": "ASSIGNMENT",
          "title": "Lab 1: Sorting Algorithms",
          "description": "Implement QuickSort in TypeScript.",
          "maxPoints": 100,
          "dueDate": "2026-09-15T23:59:59.000Z",
          "attachments": [{ "id": "att_1", "fileName": "specs.pdf", "url": "..." }],
          "submission": {
            "id": "sub_456",
            "status": "SUBMITTED",
            "grade": 95,
            "isReturned": true,
            "submittedAt": "2026-09-14T14:30:00.000Z",
            "attachments": [...]
          }
        }
      ],
      "categories": [
        { "name": "Assignments", "count": 1, "items": [...] },
        { "name": "Quizzes & Assessments", "count": 0, "items": [] },
        { "name": "Learning Materials", "count": 2, "items": [...] }
      ]
    }
    ```
- **`POST /api/courses/[courseId]/classwork`**: Create syllabus item (Instructor only).
  - Body: `{ title, description, type, maxPoints?, dueDate?, attachmentUrl?, attachmentName? }`
- **`GET /api/courses/[courseId]/people`**: Instructor info and enrolled student roster.
  - Response: `{ instructor: { name, email, avatarUrl }, students: EnrolledStudent[], totalEnrolled: number }`
- **`GET /api/courses/[courseId]/grades`**: Student's score breakdown and instructor feedback for this course.
  - Response: `{ summary: CourseGradeSummary, items: CourseGradeItem[], feedback: CourseFeedbackComment[] }`
- **`POST /api/courses/[courseId]/submissions`**: Submit assignment or draft.
  - Body: `{ syllabusItemId: string, status: 'SUBMITTED' | 'DRAFT', attachmentUrl?: string, fileName?: string }`
- **`POST /api/courses/[courseId]/submissions/grade`**: Grade student submission (Instructor only).
  - Body: `{ submissionId: string, grade: number, feedback?: string }`

### 5.3 Global LMS Features
- **Announcements**: `GET /api/announcements?institute=ics` (Institute-wide and course updates).
- **Assignments**: `GET /api/assignments?institute=ics` (All upcoming student classwork across courses).
- **Grades**: `GET /api/courses/[courseId]/grades` & `GET /api/grades?institute=ics` (Academic summary and scores).
- **Workspace Tasks**:
  - `GET /api/workspace/tasks?institute=ics`
  - `POST /api/workspace/tasks` (Body: `{ title, description?, priority: 'LOW'|'MEDIUM'|'HIGH', dueDate?, courseId? }`)
  - `PATCH /api/workspace/tasks?id=...`
  - `DELETE /api/workspace/tasks?id=...`
- **Flashcards**:
  - `GET /api/flashcards/decks?institute=ics`
  - `GET /api/flashcards/cards?deckId=...`
  - `POST /api/flashcards/progress` (Body: `{ cardId: string, status: 'unseen'|'correct'|'incorrect' }`)
  - `POST /api/flashcards/complete-session` (Body: `{ deckId: string, totalCards, correct, incorrect, unseen }`)
  - `POST /api/flashcards/decks` (Body: `{ title, description, tags, color, courseId? }`)
- **Gamification & Leaderboards**:
  - `GET /api/gamification/heartbeat`: Retrieves EXP, level, and active streak.
  - `POST /api/gamification/heartbeat`: Heartbeat ping to maintain activity streak.
  - `GET /api/gamification/new-badges`: Fetches unacknowledged earned badges.
  - `PUT /api/gamification/privacy`: `{ isLeaderboardAnonymized: boolean }`
  - `GET /api/leaderboard?institute=ics`: Top 50 ranked students by EXP with level badges.
- **Teacher Analytics**: `GET /api/analytics/at-risk?courseId=...`: Real-time risk analysis identifying students falling behind.
- **Teacher Leaderboard Management**:
  - `POST /api/gamification/incentives`: Create bonus EXP rules.
  - `POST /api/gamification/commend`: Award commendation EXP to a student.
- **Learning Materials**: `GET /api/materials?institute=ics`: Centralized syllabus attachments repository.
- **File Upload**: `POST /api/upload`: Multipart FormData with `file`. Returns `{ url: string, fileName: string, fileSize: number }`.
- **Notifications**: `GET /api/notifications`, `PATCH /api/notifications` (`{ action: "markAllRead" | "markRead", id?: string }`), `POST /api/notifications/push-token`.
- **Profile**: `GET /api/profile`, `PUT /api/profile` (update bio, phone, department, yearLevel), `POST /api/profile/avatar`.

---

## 6. EXHAUSTIVE FEATURE SPECIFICATION: STUDENT VIEW

The Student experience must feel native, fast, responsive, and rewarding.

### 6.1 Student Authentication & Onboarding
- Clean login screen with email, password, and visual Institute Selector (ICS Orange, IBE Gold, ITE Blue).
- "Remember Me" and Biometric FaceID/Fingerprint login integration (`expo-local-authentication`).
- Student registration screen with student number validator (`^\d{2}-\d{3}$`).
- Smooth animated institute branding transitions.

### 6.2 Student Dashboard (`/(student)/dashboard`)
- **Header**: User avatar, greeting ("Good morning, Kirby"), active institute badge, and notification bell with unread badge counter.
- **Gamification Status Card**:
  - Level indicator (e.g. "Level 12 Scholar", bronze/silver/gold/diamond tiers).
  - EXP progress bar to next level.
  - Daily Login Streak counter with animated flame icon.
- **Daily Login Reward Modal**:
  - Pops up on first launch of the day.
  - Displays streak day, bonus EXP awarded, and motivation prompt.
- **"Due Soon" / Priority Classwork Carousel**:
  - Cards showing classwork due in the next 7 days.
  - Color-coded countdown timer (e.g. "Due in 3 hours", "Due tomorrow").
  - 1-tap direct navigation to the submission screen.
- **Enrolled Courses Grid**:
  - Displays course cards with banner image, course code, section, room, and instructor name.
  - Quick summary indicator (e.g. "2 assignments pending").
- **Quick Action Row**:
  - "Study Flashcards", "Today's Tasks", "Study Timer".
- **Floating Study Timer**:
  - Native timer widget for tracking focused study sessions.
  - Submits duration to `StudySessionLog` on completion to award bonus EXP.

### 6.3 Course Interior Hub (`/(student)/courses/[courseId]`)
Native tab-based interface matching the Web application:
1. **Stream Tab**:
   - Course banner with code, title, and section.
   - Urgent broadcast alerts pinned to the top with category badges (`ALERT`, `REMINDER`, `GENERAL`).
   - Chronological announcement feed with instructor avatar and timestamp.
   - Commenting and question asking directly beneath announcements.
2. **Classwork Tab**:
   - Filter pills: "All", "Assignments", "Quizzes", "Materials".
   - Accordion list of items grouped by topic or type.
   - Status badge per item: `Submitted`, `Missing`, `Graded (95/100)`, or `Due date`.
   - **Assignment Detail Screen**:
     - Full assignment prompt and instructions.
     - Attached files (PDFs, docs) with preview / download options.
     - Points possible and due timestamp.
   - **Native Submission Drawer**:
     - Document picker (`expo-document-picker`) or Photo picker (`expo-image-picker`).
     - Preview of selected file name and size.
     - "Turn In" primary button (submits to `/api/courses/[courseId]/submissions`).
     - "Unsubmit" button if submission was turned in before due date and not yet graded.
     - Graded feedback card: displays numeric score, instructor comments, and return date.
3. **People Tab**:
   - Instructor card with email and photo.
   - Enrolled classmates roster.
4. **Grades Tab**:
   - Overall course grade percentage and letter grade.
   - Itemized grade breakdown table for all completed assignments/quizzes.

### 6.4 Learning Materials Library (`/(student)/materials`)
- Searchable repository of course resources across all enrolled classes.
- Course filter dropdown.
- File preview modal and native file download/share (`expo-file-system`, `expo-sharing`).

### 6.5 Tasks & Personal Planner (`/(student)/tasks`)
- Segmented control: `Pending`, `Completed`, `Archived`.
- Priority badges: High (Red), Medium (Amber), Low (Blue).
- Filter by course.
- Add Task Sheet: Title, description, due date picker, priority selector, course tag.
- Swipe-to-delete or swipe-to-complete gestures (`react-native-gesture-handler`).

### 6.6 Flashcards & Spaced Repetition (`/(student)/flashcards`)
- Decks library categorized by institute and courses.
- Deck statistics: Total cards, mastery percentage, unreviewed cards.
- **Interactive Study Mode**:
  - Reanimated 3D flip card animation on tap.
  - Front: Question/Term, Hint reveal button, optional diagram/code.
  - Back: Answer and explanation.
  - Spaced Repetition response buttons: "Again" (Red), "Hard" (Amber), "Good" (Blue), "Easy" (Emerald).
  - Progress bar through deck.
  - Session complete summary with EXP grant celebration.
- Create new deck and add cards with native forms.

### 6.7 Leaderboards & Achievements (`/(student)/leaderboard` & `achievements`)
- **Leaderboard Tab**:
  - Top 50 students ranked by total EXP and streak.
  - Highlighted row for current student.
  - Privacy switch: "Anonymize my name on the leaderboard".
- **Achievements Tab**:
  - Badges grid categorized into Learning, Streak, Excellence, Level, and Special.
  - Locked vs Unlocked visual states with progress bars.

### 6.8 Student Profile & Settings (`/(student)/profile` & `settings`)
- Avatar upload with image crop (`expo-image-picker`).
- Edit profile: Name, phone, department, year level, bio.
- Theme selector: System, Light, Dark.
- Push notification preferences.
- API base URL configuration for development testing.
- Secure Logout (clears tokens and redirects).

---

## 7. EXHAUSTIVE FEATURE SPECIFICATION: INSTRUCTOR / PROFESSOR VIEW

The Instructor experience empowers educators to monitor, evaluate, and communicate on the go.

### 7.1 Instructor Dashboard (`/(teacher)/dashboard`)
- **Metric Header Cards**:
  - Total Active Classes.
  - Total Enrolled Students.
  - Pending Enrollment Requests (with notification badge).
  - Ungraded Submissions (Pending Work queue).
- **"Pending Work to Grade" Priority Feed**:
  - Actionable list of assignments with pending student submissions.
  - Tap directly navigates to the assignment grading drawer.
- **"Pending Enrollments" Quick Review Sheet**:
  - List of students requesting to join courses.
  - 1-tap "Approve" or "Reject" with optimistic UI updates.
- **Taught Classes Grid**:
  - Cards for all active courses with enrolled student counters.
  - Quick action buttons: "Post Announcement", "Gradebook", "Classwork".

### 7.2 Class Management & Course Interior (`/(teacher)/courses/[courseId]`)
1. **Stream Management**:
   - Announcement composer with rich text support.
   - Manage pinned announcements.
   - Reply to or moderate student comments.
2. **Classwork Hub & Item Creation**:
   - List of syllabus items categorized by Assignments, Quizzes, Materials.
   - **"Create Classwork" Native Modal**:
     - Type picker: Assignment, Quiz, Learning Material.
     - Title, description, max points input.
     - Native date/time picker for due date.
     - File attachment upload (`expo-document-picker` -> `/api/upload`).
   - Edit, delete, and reorder classwork items.
3. **Gradebook & Submission Grading**:
   - Student submissions list per assignment: filter by `Submitted`, `Missing`, `Graded`, `Returned`.
   - **Submission Grading Drawer**:
     - View student details, submission timestamp, and late submission indicator.
     - In-app preview of student attached documents / photos.
     - Numeric grade input (validates against max points).
     - Private feedback notes field.
     - "Return Grade" action: Saves grade, updates status to `RETURNED`, sends push notification to student, and triggers any applicable Grade Incentive rules.
4. **People & Enrollment Approval**:
   - Instructor card.
   - Enrolled students roster with student numbers and avatar.
   - "Pending Requests" sub-tab: Review and approve/reject enrollment requests.
5. **Class Broadcasts (`broadcast.tsx`)**:
   - Compose instant notification alerts to the entire class or selected students.
   - Category tag: `GENERAL`, `REMINDER`, `ALERT`.
   - Broadcast is immediately dispatched to student notification trays.

### 7.3 Student Telemetry & At-Risk Analytics (`/(teacher)/analytics`)
- Evaluates student academic standing using the backend risk-scoring engine (`/api/analytics/at-risk`).
- Filter by Course and Risk Level (`HIGH`, `MEDIUM`, `LOW`).
- **At-Risk Student Card**:
  - Risk Badge (`HIGH RISK`, `MEDIUM RISK`, `ON TRACK`).
  - Metric breakdown: Missing assignment count, submission rate %, grade average %.
  - Quick Intervention action: Send direct message / reminder alert to the student.

### 7.4 Leaderboard Management & Grade Incentives (`/(teacher)/manage-leaderboard`)
- View course leaderboard rankings.
- **Grade Incentive Rules Manager**:
  - Create rules (e.g. "Score >= 90% earns +150 bonus EXP").
  - Toggle active/inactive state.
- **Direct Student Commendations**:
  - Award bonus EXP and commendation note to an exceptional student.
  - View audit logs of incentive transactions.

### 7.5 Archived Classes (`/(teacher)/courses/archived`)
- Browse archived courses from previous academic terms.
- View historical grades, syllabus items, and student rosters.

---

## 8. SIMULATIONS & INTERACTIVE ACTIVITIES STRATEGY

### 8.1 Context
In the web application, ICS courses feature rich 3D simulations (CodeLab Monaco editor + Judge0 compilation, PC Building simulation, Arduino IoT circuits, Server Racks, and Logic Gates).

### 8.2 Mobile Implementation Strategy
- **Isolation Principle**: The core mobile LMS (courses, classwork, grading, submissions, flashcards) **must stand 100% on its own** using native React Native components.
- **CodeLab on Mobile**:
  - Use a specialized mobile code screen or high-performance WebContainer (`CodeLabBrowserScreen.tsx`) equipped with a bi-directional JavaScript bridge.
  - The bridge handles:
    - Code submission to Judge0 (`POST /api/judge0/submissions`).
    - Real-time compiler output and test case evaluation.
    - Automatic EXP reward triggers upon completing problem sets.
- **3D Hardware Labs (PC Build, IoT, Server Rack)**:
  - If rendered on mobile, they run inside sandboxed, hardware-accelerated WebGL WebViews with a dedicated bridge.
  - The rest of the mobile application **never** relies on or blocks on these simulations.

---

## 9. MOBILE RESPONSIVENESS, TOUCH ERGONOMICS & ACCESSIBILITY

### 9.1 Touch-First Ergonomics
- **Minimum Touch Targets**: Every interactive button, icon, and list row must have a minimum touch area of **44x44 points**.
- **Thumb-Zone Navigation**: Bottom tab navigation handles primary destination switching.
- **Safe Area Insets**: Handled comprehensively via `react-native-safe-area-context` (`useSafeAreaInsets` for custom headers and floating buttons).
- **Haptic Feedback**:
  - Light impact on tab switching and accordion toggle.
  - Medium impact on form submission, turn-in, and grade return.
  - Success notification haptic when claiming daily rewards or unlocking badges.

### 9.2 Responsive Screen Layout
- Fluid flexbox layouts adapting cleanly from small phone screens (360px) to large devices and tablets.
- `KeyboardAvoidingView` (`behavior="padding"` on iOS) paired with `ScrollView` with `keyboardShouldPersistTaps="handled"` on all form screens.
- `RefreshControl` (pull-to-refresh) on all list screens.
- Skeleton loaders matching real content layouts during network requests.
- Empty states featuring Lucide icons, clear descriptive text, and a primary call-to-action button.

### 9.3 Offline Resilience
- Integration with `@react-native-community/netinfo`.
- Persistent banner (`OfflineBanner.tsx`) displays when connectivity is lost.
- TanStack Query cache persistence with appropriate `staleTime` and `gcTime` ensures recently fetched courses, syllabus items, and grades remain readable offline.

---

## 10. TARGET EXPO ROUTER ARCHITECTURE & DIRECTORY TREE

The mobile application will adopt the following structured Expo Router file hierarchy in `apps/mobile/`:

```text
apps/mobile/
├── app/
│   ├── _layout.tsx                     # Root layout: QueryClientProvider, AuthProvider, ThemeProvider, ToastProvider
│   ├── index.tsx                       # Initial routing gateway (checks auth and routes to (auth), (student), or (teacher))
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx                   # Email, password, institute selector, biometric toggle
│   │   └── register.tsx                # Student account registration
│   ├── (student)/
│   │   ├── _layout.tsx                 # Student Bottom Tabs: Dashboard, Courses, Grades, Alerts, More
│   │   ├── dashboard.tsx               # Gamification header, streak modal, due soon, enrolled courses
│   │   ├── courses/
│   │   │   ├── index.tsx               # Enrolled courses list
│   │   │   └── [courseId]/
│   │   │       ├── _layout.tsx         # Course interior top tabs (Stream, Classwork, People, Grades)
│   │   │       ├── index.tsx           # Redirects to stream
│   │   │       ├── stream.tsx          # Announcements & broadcast alerts
│   │   │       ├── classwork.tsx       # Categorized syllabus items
│   │   │       ├── assignment/
│   │   │       │   └── [itemId].tsx    # Assignment detail & native submission drawer
│   │   │       ├── people.tsx          # Instructor info & classmates roster
│   │   │       └── grades.tsx          # Course grade breakdown
│   │   ├── materials/
│   │   │   └── index.tsx               # Centralized course documents & file download
│   │   ├── grades/
│   │   │   └── index.tsx               # Global GPA and multi-course grades hub
│   │   ├── tasks/
│   │   │   └── index.tsx               # Personal task planner with priorities
│   │   ├── flashcards/
│   │   │   ├── index.tsx               # Decks catalog & stats
│   │   │   ├── [deckId]/
│   │   │   │   ├── study.tsx           # Interactive 3D flip card study session
│   │   │   │   └── edit.tsx            # Add / edit deck cards
│   │   │   └── create.tsx              # Create deck modal
│   │   ├── leaderboard/
│   │   │   └── index.tsx               # Institute leaderboard & anonymity toggle
│   │   ├── achievements/
│   │   │   └── index.tsx               # Badges & EXP reward gallery
│   │   ├── profile/
│   │   │   └── index.tsx               # Student profile view & avatar editing
│   │   └── settings/
│   │       └── index.tsx               # Theme selector, notifications, API URL, logout
│   ├── (teacher)/
│   │   ├── _layout.tsx                 # Instructor Bottom Tabs: Dashboard, Classes, Analytics, Alerts, More
│   │   ├── dashboard.tsx               # Metric cards, pending grading feed, pending enrollment approvals
│   │   ├── courses/
│   │   │   ├── index.tsx               # Taught classes list
│   │   │   ├── [courseId]/
│   │   │   │   ├── _layout.tsx         # Instructor Course interior top tabs
│   │   │   │   ├── index.tsx           # Redirects to stream
│   │   │   │   ├── stream.tsx          # Class announcements & comment moderation
│   │   │   │   ├── classwork.tsx       # Classwork list + Create Classwork modal
│   │   │   │   ├── gradebook.tsx       # Submissions matrix & grading evaluation drawer
│   │   │   │   ├── people.tsx          # Student roster & pending enrollment approvals
│   │   │   │   └── broadcast.tsx       # Instant notification dispatcher
│   │   │   └── archived.tsx            # Archived courses browser
│   │   ├── analytics/
│   │   │   └── index.tsx               # At-risk student telemetry & interventions
│   │   ├── manage-leaderboard/
│   │   │   └── index.tsx               # Grade incentive rules & student commendations
│   │   ├── profile/
│   │   │   └── index.tsx               # Instructor profile
│   │   └── settings/
│   │       └── index.tsx               # Settings & logout
│   └── activities/
│       └── codelab.tsx                 # Mobile CodeLab code editor & compiler runner
├── src/
│   ├── components/
│   │   ├── common/                     # Button, Input, Card, Badge, ScreenHeader, EmptyState, SkeletonLoader
│   │   ├── gamification/               # LoginRewardModal, StudyTimer, LevelBadge, StreakFlame
│   │   ├── submission/                 # SubmissionDrawer, FileAttachmentPicker, GradeReturnModal
│   │   └── course/                     # CourseCard, ClassworkItemRow, StreamPostCard
│   ├── hooks/                          # useAuth, useTheme, useCourses, useClasswork, useSubmissions, useAnalytics
│   ├── lib/                            # constants.ts, theme.ts, query-client.ts, api.ts
│   └── stores/                         # auth-store.ts, theme-store.ts
```

---

## 11. PROMPT & PLANNING GUIDELINES FOR GPT ASTRA

When presenting this dossier to GPT Astra, use the following prompt:

```text
You are GPT Astra, an elite Principal Mobile Architect and Senior React Native / Expo Engineer.

We are building the native EXPO Mobile Application for Lumina LMS (located in `apps/mobile/`), which connects to our existing Next.js 16 App Router backend and PostgreSQL database.

Below is the complete architectural specification, API catalog, database schema, and feature matrix for the application.

Your task is to produce a fully detailed, phase-by-phase implementation plan for the EXPO Mobile Application that fulfills the following strict requirements:
1. ONLY include the Student's View and the Instructor's / Teacher's View. (DO NOT include the Administrator's View).
2. NO WEBVIEWS OR WRAPPERS for standard LMS pages. All dashboard screens, course interior tabs (Stream, Classwork, People, Grades/Gradebook), submission drawers, flashcards, tasks, analytics, and settings must be 100% native React Native screens with solid foundations.
3. Strict touch-first responsive design: minimum 44x44pt touch targets, safe-area insets, keyboard handling, haptic feedback, pull-to-refresh, skeleton loaders, and offline indicators.
4. Full dynamic multi-institute theming (ICS Orange, IBE Gold, ITE Blue) with Dark/Light mode support.
5. End-to-end alignment with our Next.js REST API endpoints, `@lms/types`, and `@lms/api-client`.
6. Break the plan down into clear, sequenced phases:
   - Phase 1: Mobile Foundation, Expo Router Group Architecture & Core Providers.
   - Phase 2: Design System, Theming & Common Atomic Components.
   - Phase 3: Auth, Biometrics & Gateway Routing.
   - Phase 4: Student Experience (Dashboard, Courses, Classwork, Native Submissions, Flashcards, Tasks, Leaderboard, Profile).
   - Phase 5: Instructor Experience (Dashboard, Class Management, Classwork Creation, Gradebook & Grading Drawer, At-Risk Analytics, Broadcasts).
   - Phase 6: Push Notifications, Offline Caching & File Systems.
   - Phase 7: Polish, Touch Ergonomics, Error Boundaries & QA Verification.

Please review the complete specification dossier below and provide the comprehensive architectural implementation plan.
```

---
*(End of Dossier)*
