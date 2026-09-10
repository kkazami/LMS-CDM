/**
 * Configurable thresholds for Quiz & Activity Anti-Cheating Integrity Scoring.
 * Informational only — does not auto-fail or auto-flag students as cheating.
 */
export const INTEGRITY_CLEAN_THRESHOLD = 0;
export const INTEGRITY_MINOR_THRESHOLD = 2; // 1–2 events = Minor Flags
export const INTEGRITY_MULTIPLE_THRESHOLD = 3; // 3+ events = Multiple Flags

export type IntegrityRiskLevel = "CLEAN" | "MINOR" | "MULTIPLE";

export interface IntegrityEventItem {
  id: string;
  studentId: string;
  eventType: string; // "TAB_SWITCH" | "COPY_PASTE" | "FULLSCREEN_EXIT" | "RIGHT_CLICK"
  severity: string; // "LOW" | "MEDIUM" | "HIGH"
  metadata: string;
  timestamp: Date | string;
}

export interface StudentIntegritySummary {
  studentId: string;
  studentName: string;
  email: string;
  totalFlags: number;
  riskLevel: IntegrityRiskLevel;
  breakdown: {
    tabSwitches: number;
    copyPastes: number;
    fullscreenExits: number;
    rightClicks: number;
  };
  events: IntegrityEventItem[];
}

export interface IntegrityRiskMeta {
  level: IntegrityRiskLevel;
  label: string;
  badgeClasses: string;
  indicatorColor: string;
  description: string;
}

/**
 * Evaluates an array of events for a student and derives their informational risk level.
 */
export function evaluateIntegrityRisk(events: IntegrityEventItem[]): IntegrityRiskMeta {
  const totalFlags = events.length;

  if (totalFlags === INTEGRITY_CLEAN_THRESHOLD) {
    return {
      level: "CLEAN",
      label: "Clean",
      badgeClasses:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20",
      indicatorColor: "#10B981",
      description: "No suspicious events detected during attempt",
    };
  }

  if (totalFlags <= INTEGRITY_MINOR_THRESHOLD) {
    return {
      level: "MINOR",
      label: `Minor Flags (${totalFlags})`,
      badgeClasses:
        "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
      indicatorColor: "#F59E0B",
      description: `${totalFlags} minor event(s) recorded for review`,
    };
  }

  return {
    level: "MULTIPLE",
    label: `Multiple Flags (${totalFlags})`,
    badgeClasses:
      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20",
    indicatorColor: "#F43F5E",
    description: `${totalFlags} flagged events recorded for instructor evaluation`,
  };
}

/**
 * Aggregates a list of all students and all integrity events into per-student summaries.
 */
export function buildStudentIntegritySummaries(
  students: Array<{ id: string; name: string; email: string }>,
  events: IntegrityEventItem[]
): StudentIntegritySummary[] {
  const eventsByStudent = new Map<string, IntegrityEventItem[]>();

  for (const event of events) {
    const list = eventsByStudent.get(event.studentId) || [];
    list.push(event);
    eventsByStudent.set(event.studentId, list);
  }

  return students.map((student) => {
    const studentEvents = (eventsByStudent.get(student.id) || []).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    let tabSwitches = 0;
    let copyPastes = 0;
    let fullscreenExits = 0;
    let rightClicks = 0;

    for (const ev of studentEvents) {
      if (ev.eventType === "TAB_SWITCH") tabSwitches++;
      else if (ev.eventType === "COPY_PASTE") copyPastes++;
      else if (ev.eventType === "FULLSCREEN_EXIT") fullscreenExits++;
      else if (ev.eventType === "RIGHT_CLICK") rightClicks++;
    }

    const riskMeta = evaluateIntegrityRisk(studentEvents);

    return {
      studentId: student.id,
      studentName: student.name,
      email: student.email,
      totalFlags: studentEvents.length,
      riskLevel: riskMeta.level,
      breakdown: {
        tabSwitches,
        copyPastes,
        fullscreenExits,
        rightClicks,
      },
      events: studentEvents,
    };
  });
}
