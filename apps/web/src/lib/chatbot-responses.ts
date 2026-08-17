/**
 * Keyword-matched chatbot response function.
 * Designed to be easily swapped for a real AI backend later.
 *
 * @param message - The user's input message
 * @returns A bot response string
 */
export function getBotResponse(message: string): string {
  const lower = message.toLowerCase().trim();

  // ── Grade-related keywords ──
  if (/\b(grade|grades|gpa|score|marks|result|graded)\b/.test(lower)) {
    return (
      "📊 You can check all your grades on the **Grades** page in the sidebar. " +
      "It shows grades for every class you're enrolled in, with visual analytics and progress tracking. " +
      "Only assignments and quizzes that your instructor has graded will appear there."
    );
  }

  // ── Assignment / deadline keywords ──
  if (/\b(assignment|assignments|homework|deadline|due date|submission|submit|quiz|quizzes)\b/.test(lower)) {
    return (
      "📝 Check the **My Courses** section in the sidebar, then open a specific course to see " +
      "the **Classwork** tab. You'll find all assignments and quizzes with their due dates there. " +
      "You can also check the **To-do** page for a consolidated view across all your classes."
    );
  }

  // ── Announcement keywords ──
  if (/\b(announcement|announcements|news|update|posted|notice)\b/.test(lower)) {
    return (
      "📢 Head to the **Announcements** page in the sidebar to see all announcements " +
      "from your instructors. You can filter by class and expand each announcement to read the full content. " +
      "You'll also get a notification when a new announcement is posted."
    );
  }

  // ── Course / enrollment keywords ──
  if (/\b(course|courses|class|classes|enroll|join|class code|unenroll)\b/.test(lower)) {
    return (
      "📚 Go to **My Courses** in the sidebar to see all your enrolled classes. " +
      "To join a new class, click the join button and enter the class code your instructor shared with you. " +
      "Each course has its own Stream, Classwork, and People tabs."
    );
  }

  // ── Help / support keywords ──
  if (/\b(help|support|contact|problem|issue|bug|error|not working)\b/.test(lower)) {
    return (
      "🆘 If you're experiencing an issue, try these steps:\n" +
      "1. Refresh the page\n" +
      "2. Clear your browser cache\n" +
      "3. Try logging out and back in\n\n" +
      "If the problem persists, visit the **Help & Support** page from the user menu in the top-right corner."
    );
  }

  // ── Profile keywords ──
  if (/\b(profile|avatar|photo|bio|settings|account)\b/.test(lower)) {
    return (
      "👤 You can update your profile by clicking your name in the top-right corner and selecting **Profile**. " +
      "There you can change your avatar, bio, department, and other details."
    );
  }

  // ── Greeting ──
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|sup|what's up)\b/.test(lower)) {
    return (
      "👋 Hello! I'm the Lumina Assistant. I can help you navigate the LMS. Try asking me about:\n\n" +
      "• **Grades** — where to find your scores\n" +
      "• **Assignments** — deadlines and submissions\n" +
      "• **Announcements** — class updates from instructors\n" +
      "• **Courses** — enrolling and managing classes\n" +
      "• **Help** — troubleshooting common issues"
    );
  }

  // ── Thank you ──
  if (/\b(thanks|thank you|thx|ty)\b/.test(lower)) {
    return "You're welcome! 😊 Feel free to ask if you need anything else.";
  }

  // ── Fallback ──
  return (
    "🤔 I'm not sure I understand that. I can help you with:\n\n" +
    "• **Grades** — checking your scores and GPA\n" +
    "• **Assignments** — finding deadlines and classwork\n" +
    "• **Announcements** — reading class updates\n" +
    "• **Courses** — joining and viewing classes\n" +
    "• **Help** — troubleshooting issues\n\n" +
    "Try asking about one of these topics!"
  );
}
