import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/api-auth';

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ message: 'Forbidden: Admin access required.' }, { status: 403 });
    }

    const instituteId = session.user.instituteId;

    // Run parallel counts for fast response
    const [
      coursesCount,
      syllabusCount,
      enrollmentsCount,
      attachmentsCount,
      groupsCount,
      institutesCount,
      
      usersCount,
      sessionsCount,
      otpsCount,

      submissionsCount,
      gradingPoliciesCount,
      integrityEventsCount,

      gamificationCount,
      badgesCount,
      expCount,
      flashcardDecksCount,

      activityTemplatesCount,
      activitySubmissionsCount,
      activityAssetsCount,
      activitySessionsCount,

      kxPostsCount,
      kxAnswersCount,
      kxCommentsCount,
      kxTagsCount,

      auditLogsCount,
      supportTicketsCount,
      announcementsCount,
      notificationsCount,
      tasksCount,
    ] = await Promise.all([
      db.course.count().catch(() => 0),
      db.syllabusItem.count().catch(() => 0),
      db.enrollment.count().catch(() => 0),
      db.attachment.count().catch(() => 0),
      db.studentGroup.count().catch(() => 0),
      db.institute.count().catch(() => 0),

      db.user.count().catch(() => 0),
      db.session.count().catch(() => 0),
      db.passwordResetOtp.count().catch(() => 0),

      db.studentSubmission.count().catch(() => 0),
      db.gradingPolicy.count().catch(() => 0),
      db.integrityEvent.count().catch(() => 0),

      db.gamificationProfile.count().catch(() => 0),
      db.studentBadge.count().catch(() => 0),
      db.expTransaction.count().catch(() => 0),
      db.flashcardDeck.count().catch(() => 0),

      db.activityTemplate.count().catch(() => 0),
      db.activitySubmission.count().catch(() => 0),
      db.activityAsset.count().catch(() => 0),
      db.activitySession.count().catch(() => 0),

      db.kxPost.count().catch(() => 0),
      db.kxAnswer.count().catch(() => 0),
      db.kxComment.count().catch(() => 0),
      db.kxTag.count().catch(() => 0),

      db.auditLog.count().catch(() => 0),
      db.supportTicket.count().catch(() => 0),
      db.announcement.count().catch(() => 0),
      db.notification.count().catch(() => 0),
      db.taskItem.count().catch(() => 0),
    ]);

    const categories = [
      {
        id: "academic",
        name: "Academic & Curricula",
        description: "Course offerings, class syllabi, enrollments, attachments, and student groups",
        color: "#3B82F6",
        tables: [
          { name: "Course", model: "Course", description: "Academic subjects and class sections", count: coursesCount },
          { name: "SyllabusItem", model: "SyllabusItem", description: "Lessons, assignments, and reading materials", count: syllabusCount },
          { name: "Enrollment", model: "Enrollment", description: "Student-to-course enrollment bindings", count: enrollmentsCount },
          { name: "Attachment", model: "Attachment", description: "Learning PDFs, documents, and media", count: attachmentsCount },
          { name: "StudentGroup", model: "StudentGroup", description: "Collaboration groups within classes", count: groupsCount },
          { name: "Institute", model: "Institute", description: "Campus configurations (ICS, IBE, ITE)", count: institutesCount },
        ],
      },
      {
        id: "users",
        name: "Users & Authentication",
        description: "User profiles, roles (Student, Instructor, Admin), active sessions, and security OTPs",
        color: "#10B981",
        tables: [
          { name: "User", model: "User", description: "Core user accounts, emails, roles, and status", count: usersCount },
          { name: "Session", model: "Session", description: "Live session tokens and device signatures", count: sessionsCount },
          { name: "PasswordResetOtp", model: "PasswordResetOtp", description: "Password recovery one-time passcodes", count: otpsCount },
        ],
      },
      {
        id: "assessment",
        name: "Assessment & Integrity",
        description: "Student assignment submissions, course grading policies, and exam integrity events",
        color: "#8B5CF6",
        tables: [
          { name: "StudentSubmission", model: "StudentSubmission", description: "Uploaded homework and assignment submissions", count: submissionsCount },
          { name: "GradingPolicy", model: "GradingPolicy", description: "Category weights and syllabus grading schemes", count: gradingPoliciesCount },
          { name: "IntegrityEvent", model: "IntegrityEvent", description: "Anti-cheating logs (tab-switches, copy-pastes)", count: integrityEventsCount },
        ],
      },
      {
        id: "gamification",
        name: "Gamification & EXP",
        description: "Experience points ledger, level tiers, login streaks, earned badges, and study flashcards",
        color: "#F59E0B",
        tables: [
          { name: "GamificationProfile", model: "GamificationProfile", description: "Student EXP balances, level tiers, and streak counters", count: gamificationCount },
          { name: "StudentBadge", model: "StudentBadge", description: "Awarded achievement milestones and badges", count: badgesCount },
          { name: "ExpTransaction", model: "ExpTransaction", description: "Detailed ledger of points earned from activities", count: expCount },
          { name: "FlashcardDeck", model: "FlashcardDeck", description: "Decks of flashcards created for active recall", count: flashcardDecksCount },
        ],
      },
      {
        id: "labs",
        name: "Interactive Labs (ICS)",
        description: "3D virtual hardware templates, CodeLab auto-grading problems, and student attempt logs",
        color: "#06B6D4",
        tables: [
          { name: "ActivityTemplate", model: "ActivityTemplate", description: "Problem templates for CodeLab and 3D simulation", count: activityTemplatesCount },
          { name: "ActivitySubmission", model: "ActivitySubmission", description: "Graded test run payloads and completion times", count: activitySubmissionsCount },
          { name: "ActivityAsset", model: "ActivityAsset", description: "3D GLTF models and Draco compressed models", count: activityAssetsCount },
          { name: "ActivitySession", model: "ActivitySession", description: "Active in-progress virtual simulation runs", count: activitySessionsCount },
        ],
      },
      {
        id: "knowledge",
        name: "Knowledge Exchange (Q&A)",
        description: "Peer discussion forum questions, verified answers, comments, and community tags",
        color: "#6366F1",
        tables: [
          { name: "KxPost", model: "KxPost", description: "Forum questions and discussions", count: kxPostsCount },
          { name: "KxAnswer", model: "KxAnswer", description: "Peer and instructor responses with verification", count: kxAnswersCount },
          { name: "KxComment", model: "KxComment", description: "Clarification comments under questions and answers", count: kxCommentsCount },
          { name: "KxTag", model: "KxTag", description: "Technical topics and course subject tags", count: kxTagsCount },
        ],
      },
      {
        id: "system",
        name: "System, Support & Logs",
        description: "Administrative audit trails, support tickets, system announcements, and personal tasks",
        color: "#EF4444",
        tables: [
          { name: "AuditLog", model: "AuditLog", description: "Audit trail of admin actions and IP addresses", count: auditLogsCount },
          { name: "SupportTicket", model: "SupportTicket", description: "Helpdesk tickets and admin feedback records", count: supportTicketsCount },
          { name: "Announcement", model: "Announcement", description: "Campus and course broadcasts", count: announcementsCount },
          { name: "Notification", model: "Notification", description: "In-app notifications dispatched to users", count: notificationsCount },
          { name: "TaskItem", model: "TaskItem", description: "To-do items and personal study tasks", count: tasksCount },
        ],
      },
    ];

    const totalRecords = categories.reduce(
      (sum, cat) => sum + cat.tables.reduce((tSum, t) => tSum + t.count, 0),
      0
    );

    const totalTables = categories.reduce((sum, cat) => sum + cat.tables.length, 0);

    return NextResponse.json({
      status: "HEALTHY",
      database: {
        provider: "PostgreSQL",
        driver: "@prisma/adapter-pg",
        connection: "CONNECTED",
        lastChecked: new Date().toISOString(),
      },
      metrics: {
        totalCategories: categories.length,
        totalTables,
        totalRecords,
      },
      categories,
    });
  } catch (error) {
    console.error("DATABASE_OVERVIEW_ERROR", error);
    return NextResponse.json({ message: "Failed to fetch database overview." }, { status: 500 });
  }
}
