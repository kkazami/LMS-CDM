import { adminGuides, instructorGuides } from './ics-staff-help-guides';
import { canonicalRole } from './super-user-v1/capabilities';

export const helpQuestionLimit = 600;
export type IcsHelpRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';

export function getIcsHelpRole(institute: string | null | undefined, role: unknown): IcsHelpRole | null {
  const normalized = canonicalRole(role);
  if (institute?.toLowerCase() !== 'ics') return null;
  return normalized === 'STUDENT' || normalized === 'INSTRUCTOR' || normalized === 'ADMIN' ? normalized : null;
}

export type IcsHelpGuide = {
  title: string;
  answer: string;
  href: string;
  link: string;
  terms: readonly string[];
  section?: string;
  direct?: boolean;
};

const studentGuides: readonly IcsHelpGuide[] = [
  {
    title: 'Mark your attendance',
    answer: 'Open My Courses, choose your class, and select Attendance. Find the open session. For an in-person class, select Scan QR code and scan the QR your instructor is showing. Allow camera access if asked. For an online session, select Check in and enter the current code if asked. Check the session for your attendance status.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['attendance', 'check in', 'checkin', 'qr', 'scan qr', 'live code'],
    direct: true,
  },
  {
    title: 'Fix a missed or incorrect attendance mark',
    answer: 'Open your class and check the session under Attendance. If the session is still open and you can’t scan the QR or check in, use Request attendance approval if it appears. If location is the problem, look for Request approval without location. For a closed session or an incorrect mark, ask your instructor to review it.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['missed attendance', 'missed my attendance', 'missed the attendance', 'attendance approval', 'attendance request', 'attendance record', 'attendance correction', 'wrong attendance', 'incorrect attendance', 'marked absent', 'marked late', 'why am i absent', 'tardy', 'attendance closed', 'closed session', 'expired qr', 'qr expired', 'can t scan', 'couldn t scan', 'camera unavailable', 'camera not working', 'approval without location', 'location permission'],
    direct: true,
  },
  {
    title: 'Join a course',
    answer: 'Open My Courses and choose Join Course. Enter the code your instructor gave you. If your request is still pending, ask your instructor to check it.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['join a course', 'join course', 'join a class', 'join class', 'enroll', 'enrollment', 'class code', 'course code', 'pending approval', 'wrong section'],
  },
  {
    title: 'Find and submit classwork',
    answer: 'Open your course, select Classwork, and open the assignment. In Your work, select Add or create to attach a file or link. If the assignment asks for a GitHub repository, save that link instead. Select Turn in and check that the assignment shows as submitted.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['assignment', 'homework', 'classwork', 'your work', 'turn in', 'add or create', 'submit work', 'attach a file', 'upload my assignment'],
  },
  {
    title: 'Replace work you already turned in',
    answer: 'Open the assignment in Classwork. If Unsubmit is available, select it, remove the old attachment or update your link, and select Turn in again. If the deadline passed or the work was already returned, ask your instructor about making changes.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['unsubmit', 'resubmit', 'wrong file', 'replace a file', 'replace my submission', 'edit my submission', 'change my submission', 'change my attachment'],
  },
  {
    title: 'Take an online quiz or assessment',
    answer: 'Open your course and select Classwork. Open the quiz or assessment and select Start Assessment Form when available. Answer the questions and submit the form. After you submit, open the item again to view your submission or retake it if your instructor allows retakes.',
    href: '/ics/courses', link: 'Open My Courses',
    terms: ['quiz', 'assessment', 'assessment form', 'take a test', 'retake', 'online exam', 'submitted form'],
  },
  {
    title: 'Check deadlines',
    answer: 'Use Tasks & Calendar to check upcoming deadlines. Open the assignment in Classwork for its instructions and due date.',
    href: '/ics/tasks', link: 'Open Tasks & Calendar',
    terms: ['deadline', 'due date', 'due', 'schedule', 'calendar', 'tasks'],
  },
  {
    title: 'Find course announcements',
    answer: 'Open Announcements to check updates from your instructors. Use the course filter to see updates for one class, or open that course and select Stream.',
    href: '/ics/announcements', link: 'Open Announcements',
    terms: ['announcement', 'announcements', 'class update', 'course updates', 'stream', 'reminder'],
  },
  {
    title: 'Find grades and feedback',
    answer: 'Open Grades to check the results your instructor has made available. In Classwork, open an assignment to see whether it is submitted or returned and read any feedback shown there. Use Tasks & Calendar to see deadlines and work that needs attention. Ask your instructor about a missing score or feedback you want to discuss.',
    href: '/ics/grades', link: 'Open Grades',
    terms: ['grade', 'grades', 'graded', 'score', 'scores', 'feedback', 'marks', 'result'],
  },
  {
    title: 'Read or download learning materials',
    answer: 'Open Learning Materials and choose a course or file. In the PDF reader, use the arrows beside the page to move through the document. Choose Download in the toolbar to save a copy.',
    href: '/ics/learning-materials', link: 'Open Learning Materials',
    terms: ['material', 'materials', 'pdf', 'document', 'slides', 'download', 'lesson', 'handout', 'page arrows'],
  },
  {
    section: 'Study tools', title: 'Make and study flashcards',
    answer: 'Open Flashcards, create a deck, and use Add Card to add a question and answer. Open the deck when you want to study. When Learning Materials offers Convert to Flashcards, you can also start a deck from that document.',
    href: '/ics/flashcards', link: 'Open Flashcards',
    terms: ['flashcards', 'flashcard', 'deck', 'decks', 'study cards'],
  },
  {
    section: 'Study tools', title: 'Write, run, and test code in CodeLab',
    answer: 'Open CodeLab and choose a track and exercise. Write your solution in the editor. Use Run or Run Tests to check your work, then use Submit Solution when you are ready. Read the test results to see which checks passed or failed. Use the exercise instructions and output to revise your code.',
    href: '/ics/activities/codelab', link: 'Open CodeLab',
    terms: ['codelab', 'code lab', 'coding', 'programming', 'compiler', 'test case', 'track'],
  },
  {
    section: 'Study tools', title: 'Submit a GitHub repository for an assignment',
    answer: 'Open the programming assignment in Classwork. If it asks for a GitHub repository, paste its URL in GitHub repository URL and select Save repository. Make sure your instructor can access the repository, then select Turn in. Check that the work shows as submitted.',
    href: '/ics/courses', link: 'Open My Courses', terms: ['github', 'git based', 'repository', 'github repository', 'save repository', 'programming assignment'],
  },
  {
    section: 'Study tools', title: 'Learn electronics in Ohmward',
    answer: 'When Ohmward is available, open it and use Journey to choose a lesson or exercise. Use Sandbox to try circuits and My progress to review completed work. Check the activity instructions for what to save or submit.',
    href: '/ics/activities/ohmward', link: 'Open Ohmward', terms: ['ohmward', 'electronics', 'circuit', 'circuits', 'sandbox', 'ohmward progress'],
  },
  {
    section: 'Study tools', title: 'Create and manage personal notes',
    answer: 'Open Tasks & Calendar, then Open Notes. Create a note and save it under your account. Reopen it to edit it, or use the note’s controls to pin or archive it. The Notes shortcut gives you quick access while you work elsewhere in the LMS.',
    href: '/ics/tasks?view=notes', link: 'Open Notes', terms: ['note', 'notes', 'study notes', 'quick notes', 'pin note', 'archive note'],
  },
  {
    section: 'Study tools', title: 'Use the focus timer while studying',
    answer: 'In the Web Portal, open a document in Learning Materials. Use Focus Mode in the reader to open the Pomodoro timer and start or pause a study session. You can open the Web Portal on your phone to use this reader when you are studying away from your computer.',
    href: '/ics/learning-materials', link: 'Open Learning Materials', terms: ['focus', 'focus mode', 'focus tools', 'timer', 'pomodoro'],
  },
  {
    section: 'Study tools', title: 'Use Knowledge Exchange to discuss or share resources',
    answer: 'Open Knowledge Exchange to ask a question, answer a post, or share a course-related resource. Include enough context for others to follow. If a post or reply has an image, select it to see it full size.',
    href: '/ics/knowledge-exchange', link: 'Open Knowledge Exchange',
    terms: ['knowledge exchange', 'kx', 'discussion', 'forum', 'post', 'reply', 'comment', 'image'],
  },
  {
    section: 'Study tools', title: 'Check EXP or change leaderboard visibility',
    answer: 'Open Leaderboards to check your EXP and rank. Use Leaderboard visibility to choose whether others see your name and photo, your name only, or an anonymous entry.',
    href: '/ics/leaderboards', link: 'Open Leaderboards',
    terms: ['leaderboard', 'leaderboards', 'exp', 'ranking', 'rank', 'badge', 'badges', 'streak', 'anonymous', 'hide photo'],
  },
  {
    section: 'Mobile app', title: 'Find courses and learning resources on mobile',
    answer: 'Sign in to the mobile app with the same ICS account. Open My Courses and choose your class. Use Stream for announcements, Classwork for assignments and posted resources, and the available grade view for results. Open the Web Portal for resources or actions the app doesn’t show.',
    href: '/ics/courses', link: 'Open My Courses on the web', terms: ['mobile', 'mobile classes', 'phone', 'mobile grades', 'mobile resources', 'android', 'ios'],
  },
  {
    section: 'Mobile app', title: 'Open saved notes, tasks, and flashcards on mobile',
    answer: 'From the mobile app’s tools, open Workspace Planner to find saved notes and track your tasks. Open Flashcards to review your decks. Use the same account as on the web and check that your edits saved before switching devices.',
    href: '/ics/tasks?view=notes', link: 'Open Notes on the web', terms: ['workspace planner', 'mobile notes', 'mobile flashcards', 'mobile tasks', 'study tasks', 'across devices', 'sync'],
  },
  {
    section: 'Account and access', title: 'Update your profile or program',
    answer: 'Open Profile to change your name, photo, bio, or program. Save your changes after editing your profile details.',
    href: '/ics/profile', link: 'Open Profile',
    terms: ['profile', 'avatar', 'profile photo', 'profile picture', 'program', 'bio', 'change name'],
  },
];

const sharedGuides: readonly IcsHelpGuide[] = [
  {
    section: 'Account and access', title: 'Reset your own LMS password',
    answer: 'Use Forgot Password on the sign-in page and follow the reset instructions. If you can’t access the email on your account, contact support.',
    href: '/forgot-password', link: 'Open Forgot Password',
    terms: ['forgot password', 'forgot my password', 'reset my password', 'locked out', 'sign in', 'log in', 'login'],
  },
  {
    section: 'Account and access', title: 'Why can’t I open a class or use a feature?',
    answer: 'Sign in with your assigned LMS account and check that you are in ICS. Class records are available to people with the right role and access to that class. If you have the wrong role or class membership, ask your instructor or LMS support to check it. LMS accounts and classroom records are managed here separately from the CdM Registrar.',
    href: '/ics/report-a-problem', link: 'Report a problem', terms: ['access denied', 'class permissions', 'can t open', 'authentication', 'account role', 'registrar', 'privacy', 'wrong account'],
  },
  {
    section: 'Troubleshooting', title: 'Check whether your work saved after a disconnect',
    answer: 'Reconnect and reopen the same item on the same account. Look for its saved status, submitted work, or most recent record before repeating an action. If the web and mobile views differ, refresh both and check the class, account, and available features. Contact support if a saved record still looks wrong.',
    href: '/ics/report-a-problem', link: 'Report a problem', terms: ['disconnect', 'lost connection', 'did it save', 'not saved', 'record missing', 'different device', 'sync issue', 'resume', 'interruption'],
  },
  {
    section: 'Troubleshooting', title: 'Report something slow or broken',
    answer: 'Open Report a problem and choose the affected area. Explain what you expected, what happened, and how to repeat it. You can attach a screenshot or short video. Check My tickets here for replies.',
    href: '/ics/report-a-problem', link: 'Report a problem',
    terms: ['bug', 'broken', 'loading', 'error', 'slow', 'performance', 'upload failed', 'not working', 'report a problem', 'ticket', 'support'],
  },
];

const guidesByRole = {
  STUDENT: [...studentGuides, ...sharedGuides],
  INSTRUCTOR: [...instructorGuides, ...sharedGuides],
  ADMIN: [...adminGuides, ...sharedGuides],
} satisfies Record<IcsHelpRole, IcsHelpGuide[]>;

export function getIcsHelpGuides(role: IcsHelpRole) {
  return guidesByRole[role];
}

export function findIcsHelpGuides(question: string, role: IcsHelpRole = 'STUDENT') {
  const words = ` ${question.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `;
  return getIcsHelpGuides(role)
    .map((guide) => ({
      guide,
      score: guide.terms.reduce((total, term) => {
        if (!words.includes(` ${term} `)) return total;
        const wordCount = term.split(' ').length;
        return total + wordCount * wordCount;
      }, 0),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ guide }) => guide);
}
