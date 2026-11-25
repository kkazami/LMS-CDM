import { db } from "@/lib/db";
import type { IntegrityEventItem } from "@/lib/integrity-scoring";

export interface FormLiveStudentItem {
  id: string;
  name: string;
  email: string;
  studentNumber: string | null;
}

export interface FormLiveAttemptItem {
  id: string;
  userId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  timeSpentSecs: number | null;
  deadlineAt: string | null;
  rawScore: number | null;
  totalPoints: number | null;
  percentage: number | null;
  passed: boolean | null;
  syncedToGradebook: boolean;
  tabSwitchCount: number;
  copyPasteCount: number;
  answeredCount: number;
  lastActivityAt: string;
  isGraded: boolean;
}

export interface FormLiveProctoringSettings {
  isProctored: boolean;
  detectTabSwitch: boolean;
  disableCopyPaste: boolean;
  lockBrowser: boolean;
}

export interface FormLiveMonitorSnapshot {
  serverNow: string;
  form: {
    id: string;
    courseId: string;
    syllabusItemId: string;
    title: string;
    formType: string;
    status: string;
    timeLimitMins: number | null;
    maxAttempts: number;
    totalPoints: number;
    totalQuestions: number;
    monitoringEnabled: boolean;
    proctoringSettings: FormLiveProctoringSettings;
  };
  students: FormLiveStudentItem[];
  attempts: FormLiveAttemptItem[];
  integrityEvents: IntegrityEventItem[];
}

export async function getFormLiveMonitorSnapshot(
  courseId: string,
  formId: string
): Promise<FormLiveMonitorSnapshot | null> {
  const form = await db.form.findUnique({
    where: { id: formId },
    select: {
      id: true,
      courseId: true,
      syllabusItemId: true,
      title: true,
      formType: true,
      status: true,
      timeLimitMins: true,
      maxAttempts: true,
      totalPoints: true,
      isProctored: true,
      detectTabSwitch: true,
      disableCopyPaste: true,
      lockBrowser: true,
      syllabusItem: {
        select: {
          enableIntegrityMonitoring: true,
          requireFullscreen: true,
        },
      },
      questions: {
        where: { questionType: { not: "SECTION_HEADER" } },
        select: { id: true, points: true, questionType: true },
      },
    },
  });

  if (!form || form.courseId !== courseId) {
    return null;
  }

  const [enrollments, rawAttempts, rawIntegrityEvents] = await Promise.all([
    db.enrollment.findMany({
      where: { courseId, status: "APPROVED" },
      select: {
        student: {
          select: {
            id: true,
            name: true,
            email: true,
            studentNumber: true,
          },
        },
      },
      orderBy: { student: { name: "asc" } },
    }),
    db.formAttempt.findMany({
      where: { formId },
      select: {
        id: true,
        userId: true,
        attemptNumber: true,
        status: true,
        startedAt: true,
        submittedAt: true,
        timeSpentSecs: true,
        deadlineAt: true,
        rawScore: true,
        totalPoints: true,
        percentage: true,
        passed: true,
        syncedToGradebook: true,
        tabSwitchCount: true,
        copyPasteCount: true,
        _count: {
          select: { answers: true },
        },
        answers: {
          select: {
            answeredAt: true,
            instructorGraded: true,
            autoGraded: true,
          },
          orderBy: { answeredAt: "desc" },
        },
      },
      orderBy: [{ attemptNumber: "desc" }, { startedAt: "desc" }],
    }),
    db.integrityEvent.findMany({
      where: { syllabusItemId: form.syllabusItemId },
      select: {
        id: true,
        studentId: true,
        eventType: true,
        severity: true,
        metadata: true,
        timestamp: true,
      },
      orderBy: { timestamp: "asc" },
    }),
  ]);

  const hasManualGradableQuestions = form.questions.some((q) =>
    ["PARAGRAPH", "CODE_ANSWER", "FILE_UPLOAD"].includes(q.questionType)
  );

  const computedTotalPoints =
    form.totalPoints ??
    form.questions.reduce((acc, q) => acc + (q.points || 0), 0);

  const students: FormLiveStudentItem[] = enrollments.map((e) => ({
    id: e.student.id,
    name: e.student.name,
    email: e.student.email,
    studentNumber: e.student.studentNumber ?? null,
  }));

  // Also ensure any student who has an attempt (even if enrollment status changed) is represented in the roster
  const enrolledIds = new Set(students.map((s) => s.id));
  const missingUserIds = Array.from(
    new Set(
      rawAttempts
        .map((a) => a.userId)
        .filter((uid) => !enrolledIds.has(uid))
    )
  );
  if (missingUserIds.length > 0) {
    const extraUsers = await db.user.findMany({
      where: { id: { in: missingUserIds } },
      select: {
        id: true,
        name: true,
        email: true,
        studentNumber: true,
      },
    });
    for (const u of extraUsers) {
      students.push({
        id: u.id,
        name: u.name,
        email: u.email,
        studentNumber: u.studentNumber ?? null,
      });
    }
  }

  const attempts: FormLiveAttemptItem[] = rawAttempts.map((att) => {
    const isSubmitted =
      att.status === "SUBMITTED" || att.status === "TIMED_OUT";
    const latestAnswerAt = att.answers[0]?.answeredAt ?? null;
    const lastActivityDate =
      latestAnswerAt ?? att.submittedAt ?? att.startedAt;
    const allManualGraded = hasManualGradableQuestions
      ? att.answers.some((a) => a.instructorGraded)
      : true;
    const isGraded =
      isSubmitted &&
      (Boolean(att.syncedToGradebook) ||
        (att.rawScore !== null && allManualGraded));

    return {
      id: att.id,
      userId: att.userId,
      attemptNumber: att.attemptNumber,
      status: att.status,
      startedAt: att.startedAt.toISOString(),
      submittedAt: att.submittedAt ? att.submittedAt.toISOString() : null,
      timeSpentSecs: att.timeSpentSecs ?? null,
      deadlineAt: att.deadlineAt ? att.deadlineAt.toISOString() : null,
      rawScore: isSubmitted ? att.rawScore : null,
      totalPoints: att.totalPoints ?? computedTotalPoints,
      percentage: isSubmitted ? att.percentage : null,
      passed: isSubmitted ? att.passed : null,
      syncedToGradebook: Boolean(att.syncedToGradebook),
      tabSwitchCount: att.tabSwitchCount || 0,
      copyPasteCount: att.copyPasteCount || 0,
      answeredCount: att._count.answers,
      lastActivityAt: lastActivityDate.toISOString(),
      isGraded,
    };
  });

  const integrityEvents: IntegrityEventItem[] = rawIntegrityEvents.map((ev) => ({
    id: ev.id,
    studentId: ev.studentId,
    eventType: ev.eventType,
    severity: ev.severity,
    metadata: ev.metadata,
    timestamp: ev.timestamp.toISOString(),
  }));

  const monitoringEnabled = Boolean(
    form.isProctored ||
      form.detectTabSwitch ||
      form.disableCopyPaste ||
      form.lockBrowser ||
      form.syllabusItem?.enableIntegrityMonitoring ||
      form.syllabusItem?.requireFullscreen
  );

  return {
    serverNow: new Date().toISOString(),
    form: {
      id: form.id,
      courseId: form.courseId,
      syllabusItemId: form.syllabusItemId,
      title: form.title,
      formType: form.formType,
      status: form.status,
      timeLimitMins: form.timeLimitMins ?? null,
      maxAttempts: form.maxAttempts,
      totalPoints: computedTotalPoints,
      totalQuestions: form.questions.length,
      monitoringEnabled,
      proctoringSettings: {
        isProctored: Boolean(
          form.isProctored || form.syllabusItem?.enableIntegrityMonitoring
        ),
        detectTabSwitch: Boolean(form.detectTabSwitch),
        disableCopyPaste: Boolean(form.disableCopyPaste),
        lockBrowser: Boolean(
          form.lockBrowser || form.syllabusItem?.requireFullscreen
        ),
      },
    },
    students,
    attempts,
    integrityEvents,
  };
}
