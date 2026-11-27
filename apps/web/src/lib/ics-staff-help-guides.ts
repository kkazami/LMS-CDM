import type { IcsHelpGuide } from './ics-help-guides';

export const instructorGuides: readonly IcsHelpGuide[] = [
  {
    section: 'Classes and attendance', title: 'Upload and organize course materials',
    answer: 'Open My Courses, choose a class you teach, and open Classwork. Select Add Task, choose Material, enter a title, and attach the file or link. Use Edit Classwork Item to update the title, description, or attachments. Students can find the material through Classwork or Learning Materials.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['upload', 'course materials', 'organize materials', 'add material', 'lecture notes', 'classwork'],
  },
  {
    section: 'Classes and attendance', title: 'Post a class announcement',
    answer: 'Open the class and select Stream. Write and post your update there so students in that class can see it. Open the post menu on one of your announcements to edit or delete it.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['announcement', 'announcements', 'stream', 'class update', 'post an update'],
  },
  {
    section: 'Classes and attendance', title: 'Start and monitor an attendance session',
    answer: 'Open the class, select Attendance, and choose Start attendance. Set the session title, mode, and check-in times. Show the current QR for in-person check-in or share the live remote code if you enabled one. Open the session roster to see who has checked in. Use End attendance when you are ready to close the session.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['attendance', 'start attendance', 'create attendance', 'attendance session', 'check ins', 'monitor attendance', 'qr'], direct: true,
  },
  {
    section: 'Classes and attendance', title: 'Correct an attendance mark or review a request',
    answer: 'Open the class’s Attendance tab and find the session. Search for the student, select Mark attendance, choose the correct status, and enter a reason. If the session has attendance requests, review them in Attendance requests and choose Accept or Decline as appropriate.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['mark attendance', 'change attendance', 'correct attendance', 'attendance request', 'attendance status', 'absent', 'tardy'], direct: true,
  },
  {
    section: 'Classwork and grades', title: 'Create an assignment or assessment',
    answer: 'Open the class and select Classwork. Use Add Task for an assignment, quiz, or material. Set the instructions, points, and due date as needed. Use Create Form Assessment to build a quiz students answer in the LMS. Open the item after saving to verify its instructions and attachments.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['create assignment', 'add task', 'create quiz', 'form assessment', 'classwork item', 'course management'],
  },
  {
    section: 'Classwork and grades', title: 'Review submissions and return feedback',
    answer: 'Open the item in Classwork and select Student Submissions. Check the submission status and open the student’s work. Choose Grade or Update grade, enter the score and feedback, then use Return grade to share the result. For repository assignments, open the GitHub link in the submitted work using an account with access.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['submissions', 'submitted work', 'submission status', 'return grade', 'feedback', 'git based', 'repository', 'github'],
  },
  {
    section: 'Classwork and grades', title: 'Record scores and check grade weights',
    answer: 'Open your class’s Gradebook or choose the class in Gradebooks. Select a score cell to enter or update a score. Use Assign periods to place work in Midterm or Finals and Grading policy to review or adjust weights. Use Final Grades to check the summary, or Export CSV to save the gradebook.',
    href: '/ics/gradebooks', link: 'Open Gradebooks', terms: ['gradebook', 'record scores', 'weights', 'grading policy', 'assessment components', 'midterm', 'final grades', 'export grades'],
  },
  {
    section: 'Classwork and grades', title: 'Review class performance',
    answer: 'Open Student Analytics and select a class you teach to review its summaries. Use Gradebook and the original submissions to follow up on a score or missing work. The summaries describe records already in the LMS. Check the class before acting on them.',
    href: '/ics/analytics', link: 'Open Student Analytics', terms: ['analytics', 'academic summaries', 'class progress', 'student performance', 'at risk'],
  },
  {
    section: 'Teaching tools', title: 'Review CodeLab results',
    answer: 'Open CodeLab from Teaching tools to review programming submissions and their test results. Check the student, activity, and test outcome before following up. Students can write code, run tests, and submit a solution in CodeLab. To review GitHub coursework, open its Classwork submission instead.',
    href: '/ics/activities/codelab/instructor', link: 'Open CodeLab', terms: ['codelab', 'programming solutions', 'test cases', 'test results', 'programming activity'],
  },
  {
    section: 'Teaching tools', title: 'Preview Ohmward and check class progress',
    answer: 'When Ohmward is available, open it from the sidebar. Use Preview Ohmward to see the lessons and activities. Return to analytics and select a class you teach to review lesson and activity completion for that class.',
    href: '/ics/activities/ohmward/instructor', link: 'Open Ohmward', terms: ['ohmward', 'electronics', 'preview lessons', 'circuit activities', 'lesson completion'],
  },
  {
    section: 'Teaching tools', title: 'Plan teaching tasks and keep notes',
    answer: 'Use Calendar to check scheduled work, or open Notes to save lesson ideas and references under your account. Create or update work students should see in the class’s Classwork tab. Personal notes and tasks are for your own planning.',
    href: '/ics/tasks?view=notes', link: 'Open Notes', terms: ['notes', 'teaching notes', 'teaching tasks', 'calendar', 'planner', 'personal records', 'focus'],
  },
  {
    section: 'Teaching tools', title: 'Answer students in Knowledge Exchange',
    answer: 'Open Knowledge Exchange and select a question. Add an answer, or reply to an existing answer to clarify a point. You can share course-related resources through a post. Keep individual grades and private class information in the appropriate class view.',
    href: '/ics/knowledge-exchange', link: 'Open Knowledge Exchange', terms: ['knowledge exchange', 'discussion', 'answer a question', 'share resources', 'post a resource'],
  },
  {
    section: 'Mobile app', title: 'Find class updates and saved work on mobile',
    answer: 'Sign in with the same ICS instructor account. Open Courses to find the classes you teach, then check Stream for updates or Classwork for available items. Open the workspace from the app’s tools to see your saved personal notes and tasks. Use the Web Portal for controls that aren’t shown in the app.',
    href: '/ics/courses', link: 'Open My Courses on the web', terms: ['mobile', 'phone', 'app', 'across devices', 'sync', 'mobile updates'],
  },
];

export const adminGuides: readonly IcsHelpGuide[] = [
  {
    section: 'Accounts and settings', title: 'Create or update a student or instructor account',
    answer: 'In the Desktop Administrator Console, open Account Management from Navigate or Accounts from the sidebar. Use Create User for an account in your institute. For an existing account, find the person in the directory and choose Edit Profile. The row menu also shows available account actions, such as password reset, suspension, or reactivation.',
    href: '/ics/accounts', link: 'Open Accounts', terms: ['create user', 'create account', 'edit profile', 'update account', 'suspend', 'reactivate', 'reset password', 'user accounts'],
  },
  {
    section: 'Accounts and settings', title: 'Assign a role and check your permissions',
    answer: 'In Accounts, open the row menu and use Change Role if it is available for that account. You can manage students and instructors in your institute. Review your scope on Administrator access. A Super User manages Administrator accounts and global permissions.',
    href: '/ics/accounts/permissions', link: 'Open Administrator access', terms: ['change role', 'assign role', 'roles', 'permissions', 'permission matrix', 'scope', 'global settings'],
  },
  {
    section: 'Accounts and settings', title: 'Review available admin settings',
    answer: 'Open Security to review available account and session controls. Use Course Management or roster onboarding for permitted course and roster changes. Check the institute and the affected record before saving. Contact your system administrator for a setting outside your permissions.',
    href: '/ics/security', link: 'Open Security', terms: ['configure', 'system settings', 'configuration', 'settings', 'security', 'sessions', 'session controls'],
  },
  {
    section: 'Records and reports', title: 'Read activity and audit records',
    answer: 'Open Audit Logs from Navigate or the sidebar. Use the action filter to narrow the list. Review the recorded action, account, and time together. If an expected action is missing, check the filter and verify the record in the tool where it was changed.',
    href: '/ics/logs', link: 'Open Audit Logs', terms: ['audit', 'audit logs', 'activity records', 'recorded actions', 'timestamp', 'monitoring'],
  },
  {
    section: 'Records and reports', title: 'Export an available report',
    answer: 'In Accounts, select the directory view you need and use Export CSV. In Database, use a supported table’s export control for JSON. In the desktop console, open Audit Logs first, then choose Tools and Export Audit Log (PDF) to save the current view. Available exports are provided in their own tools.',
    href: '/ics/accounts', link: 'Open Accounts', terms: ['report', 'reports', 'administrative report', 'generate report', 'export', 'export report', 'export csv', 'export json', 'download report'],
  },
  {
    section: 'Records and reports', title: 'Review reported problems and support requests',
    answer: 'Open Support Tickets and select the report or request. Read the details and open any attachment you are allowed to view. Reply or update its status from the ticket. Users can see replies under My tickets.',
    href: '/ics/admin/support-tickets', link: 'Open Support Tickets', terms: ['support tickets', 'reported problem', 'problem reports', 'support requests', 'ticket status'],
  },
  {
    section: 'Backup and recovery', title: 'Create a snapshot and check its status',
    answer: 'In the desktop Navigate menu, choose Backup & Recovery. In Database, open Snapshots & Backups and use Create Snapshot Now. Check the list for the creation time and status. Snapshots record an institute database summary. Use a supported table export when you need a copy of record data.',
    href: '/ics/admin/database', link: 'Open Database', terms: ['backup', 'backups', 'snapshot', 'create snapshot', 'backup status', 'backup history', 'preserve data'],
  },
  {
    section: 'Backup and recovery', title: 'Restore supported fields on existing records',
    answer: 'Open Database and choose Restore from Backup in Snapshots & Backups. Use the supported JSON export and review the preview before confirming. The console restores allowed fields on existing User, Course, and Classwork records in your institute. Ask the system operator for a full database recovery or recovery of deleted records.',
    href: '/ics/admin/database', link: 'Open Database', terms: ['restore', 'recovery', 'restore data', 'restore from backup', 'backup restore', 'deleted records'],
  },
  {
    section: 'Troubleshooting', title: 'Check a slow or interrupted admin action',
    answer: 'After reconnecting, reopen the record or snapshot list and check its current status before repeating the action. Use the same approved LMS address in the console and Web Portal. If it stays slow or fails, report the screen, time, and error message without including exported records or account details.',
    href: '/ics/report-a-problem', link: 'Report a problem', terms: ['desktop', 'interrupted', 'failed', 'slow', 'offline', 'compatibility', 'error', 'connection', 'performance'],
  },
];
