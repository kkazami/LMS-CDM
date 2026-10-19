# Student View Flowcharts

Open `student-view.drawio` in diagrams.net (File > Open From > Device). All boxes,
arrows, labels, and page layouts are editable. The document has three pages:

1. Student overview: principal web dashboard navigation.
2. Account access: login, registration, validation, and session creation.
3. Course enrollment: join-code validation, pending requests, and instructor decisions.

Matching `.svg` files are vector figures for manuscript insertion. `.png` files
are preview images. Matching `.mmd` files can be pasted into Mermaid Live Editor;
edit the source and export a new diagram there. Keep source and exported images
aligned after edits. `generate.py` regenerates the drawio/SVG versions from its
shared diagram definitions; running it overwrites edits to those generated files.

## Scope and assumptions

- The overview describes the Student Web Portal. It does not establish identical
  mobile functionality. Mobile functions follow the evaluated release.
- The calendar and note-event snapshot features are included under the user's
  assumption that the agreed expansion has been implemented.
- Students do not access the faculty directory, faculty-only events, teaching
  controls, Super User supervision, or the native Administrator Console.
- Student calendar content comprises authorized saved events and coursework
  deadlines. Recurring student class projection is outside this release.
- Registration follows the inspected account-creation handler. OTP verification
  and account approval are not invented here. Add separate steps if the evaluated
  release implements those requirements. Account access checks include active
  status, student role, and institute eligibility.
- A valid join code creates a pending request. Instructor review is asynchronous:
  students can return to the dashboard while waiting; no course access is granted
  until approval. The instructor-review box is contextual, not a student action.
- Every protected read/write uses backend authorization. The navigation overview
  groups capabilities; it is not an exhaustive processing, database, or security
  diagram. Session expiry returns the user to authentication. Failed reads/writes
  require feedback and retry according to the source module.
- CodeLab execution and Git submission are distinct workflows. Forum reputation,
  EXP, and academic grades are separate records.

## Suggested manuscript explanation

The Student View begins when a student opens the Web Portal and selects the
appropriate institute. Existing users enter their email and password, while new
users complete the supported registration process. The backend validates the
credentials and applicable account, role, and institute restrictions before
creating a student session and opening the dashboard.

The dashboard allows the student to choose an authorized academic or study module.
Students access approved enrolled courses, retrieve materials and announcements,
complete permitted coursework, and view their own grades. Additional functions
include personal notes and tasks, authorized calendar events and deadlines,
flashcards and enabled study tools, gamified progression, Knowledge Exchange,
and the distinct CodeLab and Git coursework workflows. Note-event conversion
creates private snapshots rather than continuously synchronized copies.

To join a course, the student enters a join code. The system checks its validity,
institute eligibility, and existing enrollment status. A new request is saved as
pending and reviewed by the assigned instructor. Students may continue using
other permitted modules while waiting. Course access is granted only after
approval; rejected and pending requests do not grant enrolled-course access.

After completing an action, the student can return to the dashboard to select
another module or log out to end the session. Record access and changes remain
subject to server-side authorization, source-module validation, and the functions
available in the evaluated release.
