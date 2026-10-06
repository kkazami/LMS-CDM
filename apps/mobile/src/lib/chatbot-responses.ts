/**
 * Keyword-matched chatbot response function for CdM Assistant.
 * Shared logic between Web and Mobile LMS platforms.
 *
 * @param message - The user's input message
 * @returns A bot response string
 */
export function getBotResponse(message: string): string {
  const lower = message.toLowerCase().trim();

  // ── Grade-related keywords ──
  if (/\b(grade|grades|gpa|score|marks|result|graded)\b/.test(lower)) {
    return (
      "📊 You can check all your grades on the Grades tab below. " +
      "It shows your cumulative GPA, course percentage averages, visual SVG charts, and per-subject progress. " +
      "Only assignments and quizzes that your instructor has graded will appear there."
    );
  }

  // ── Assignment / deadline keywords ──
  if (/\b(assignment|assignments|homework|deadline|due date|submission|submit|quiz|quizzes|task|tasks)\b/.test(lower)) {
    return (
      "📝 Check the Courses tab to see classwork, assignments, and quizzes with due dates for each enrolled class. " +
      "You can also check the Pending Tasks counter on your Dashboard for upcoming deadlines."
    );
  }

  // ── Announcement keywords ──
  if (/\b(announcement|announcements|news|update|posted|notice|bulletin)\b/.test(lower)) {
    return (
      "📢 Tap 'View All' on the Campus Bulletins & Announcements section on your Dashboard " +
      "to view all announcements for your enrolled courses. You can filter by subject and search by keyword."
    );
  }

  // ── Course / enrollment keywords ──
  if (/\b(course|courses|class|classes|enroll|join|class code|unenroll|subject)\b/.test(lower)) {
    return (
      "📚 Tap the Courses tab below to see all your active enrolled subjects and faculty instructors. " +
      "To join a new class, use the class code provided by your instructor."
    );
  }

  // ── Help / support keywords ──
  if (/\b(help|support|contact|problem|issue|bug|error|not working)\b/.test(lower)) {
    return (
      "🆘 If you're experiencing an issue with the app:\n" +
      "1. Pull down to refresh your current screen\n" +
      "2. Check your internet connection\n" +
      "3. Try logging out and back in from the More tab\n\n" +
      "If the problem persists, please contact your institute administrator or IT support desk."
    );
  }

  // ── Profile keywords ──
  if (/\b(profile|avatar|photo|bio|settings|account)\b/.test(lower)) {
    return (
      "👤 You can view and manage your student profile and settings from the More tab in the bottom navigation."
    );
  }

  // ── Greeting ──
  if (/^(hi|hello|hey|good morning|good afternoon|good evening|sup|what's up)\b/.test(lower)) {
    return (
      "👋 Hello! I'm the CdM Assistant. I can help you navigate your LMS. Try asking me about:\n\n" +
      "• Grades — where to find your scores and GPA\n" +
      "• Assignments — deadlines and classwork\n" +
      "• Announcements — course bulletins from instructors\n" +
      "• Courses — viewing your enrolled subjects\n" +
      "• Help — troubleshooting common issues"
    );
  }

  // ── Thank you ──
  if (/\b(thanks|thank you|thx|ty|salamat)\b/.test(lower)) {
    return "You're welcome! 😊 Feel free to ask if you need anything else.";
  }

  // ── Fallback ──
  return (
    "🤔 I'm not sure I understand that yet. I can help you with:\n\n" +
    "• Grades — checking your scores and GPA\n" +
    "• Assignments — finding deadlines and classwork\n" +
    "• Announcements — reading class bulletins\n" +
    "• Courses — viewing enrolled classes\n" +
    "• Help — app troubleshooting\n\n" +
    "Try asking about one of these topics!"
  );
}
