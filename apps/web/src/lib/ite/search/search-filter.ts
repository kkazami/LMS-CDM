/**
 * Canonical institute code that qualifies for Interactive Activities (CodeLab, 3D simulations).
 * Client-safe pure constant to avoid bundling server-only database modules into client components.
 */
export const ACTIVITIES_ELIGIBLE_INSTITUTE = "ics";

export function isEligibleActivityInstitute(instituteCode: string): boolean {
  return (instituteCode || "").toLowerCase() === ACTIVITIES_ELIGIBLE_INSTITUTE;
}

export interface SearchItemLike {
  id: string;
  title: string;
  subtitle?: string;
  category: "Administration" | "Navigation" | "Courses" | "Activities" | "Tools";
  href: string;
  icon: any;
}

export interface SearchFilterOptions {
  items: SearchItemLike[];
  instituteCode: string;
  userRole?: string;
  isEligibleForActivities?: boolean;
  isEligibleForMeetings?: boolean;
  isEligibleForPracticum?: boolean;
  meetingsIcon?: any;
  practicumIcon?: any;
}

/**
 * Filter and augment search items according to institute eligibility rules.
 *
 * SCOPE RULE (ITE ONLY):
 * For non-ITE institutes (ICS, IBE), the items list is returned exactly as provided.
 * For ITE, CodeLab and ICS-only tools are excluded using the same activities eligibility
 * logic as the rest of the application, and Meetings and Practicum navigation items
 * are conditionally appended based on user role and eligibility flags.
 */
export function filterSearchItems({
  items,
  instituteCode,
  userRole,
  isEligibleForActivities,
  isEligibleForMeetings,
  isEligibleForPracticum,
  meetingsIcon,
  practicumIcon,
}: SearchFilterOptions): SearchItemLike[] {
  const code = (instituteCode || "").toLowerCase();
  const isIte = code === "ite";

  // SCOPE GUARANTEE: Non-ITE institutes see identical results as before
  if (!isIte) {
    return items;
  }

  // Activities eligibility: use the canonical check
  const activitiesAllowed = isEligibleForActivities ?? isEligibleActivityInstitute(code);

  const role = (userRole || "STUDENT").toUpperCase();
  const isStudent = role === "STUDENT";
  const isProfessor = role === "PROFESSOR" || role === "TEACHER" || role === "INSTRUCTOR";

  // Filter out any activity/tools not allowed for ITE (such as CodeLab)
  let result = items.filter((item) => {
    if (!activitiesAllowed && item.href.includes("/activities/codelab")) {
      return false;
    }
    return true;
  });

  // Ensure Meetings is included for ITE students & instructors if eligible
  const canAccessMeetings =
    (isEligibleForMeetings ?? true) && (isStudent || isProfessor);
  const hasMeetings = result.some(
    (item) => item.id === "nav-meetings" || item.href === `/${code}/meetings`
  );

  if (canAccessMeetings && !hasMeetings && meetingsIcon) {
    // Insert after learning materials or courses
    const meetingsItem: SearchItemLike = {
      id: "nav-meetings",
      title: "Meetings",
      subtitle: isProfessor
        ? "Create and manage class video calls and virtual rooms"
        : "Join scheduled online meetings and class calls",
      category: "Navigation",
      href: `/${code}/meetings`,
      icon: meetingsIcon,
    };

    // Find position to insert cleanly in Navigation/Courses section
    const insertIdx = result.findIndex(
      (item) => item.id === "nav-materials" || item.id === "prof-materials"
    );
    if (insertIdx !== -1) {
      result = [
        ...result.slice(0, insertIdx + 1),
        meetingsItem,
        ...result.slice(insertIdx + 1),
      ];
    } else {
      result.push(meetingsItem);
    }
  }

  // Ensure Practicum is included for ITE students & instructors if eligible
  const canAccessPracticum =
    (isEligibleForPracticum ?? true) && (isStudent || isProfessor);
  const hasPracticum = result.some(
    (item) => item.id === "nav-practicum" || item.href === `/${code}/practicum`
  );

  if (canAccessPracticum && !hasPracticum && practicumIcon) {
    const practicumItem: SearchItemLike = {
      id: "nav-practicum",
      title: "Practicum",
      subtitle: isProfessor
        ? "Review intern documents, requirements, and progress"
        : "Track field study hours, journals, and requirements",
      category: "Navigation",
      href: `/${code}/practicum`,
      icon: practicumIcon,
    };

    const meetingsIdx = result.findIndex((item) => item.id === "nav-meetings");
    if (meetingsIdx !== -1) {
      result = [
        ...result.slice(0, meetingsIdx + 1),
        practicumItem,
        ...result.slice(meetingsIdx + 1),
      ];
    } else {
      result.push(practicumItem);
    }
  }

  return result;
}

/**
 * Returns the focus ring color for SearchModal input row.
 * For ITE: returns the theme primary accent (blue).
 * For ICS / IBE: returns the incumbent default orange (#F97316).
 */
export function getSearchFocusRingColor(
  instituteCode: string,
  primaryThemeColor: string
): string {
  if ((instituteCode || "").toLowerCase() === "ite") {
    return primaryThemeColor || "#2563EB";
  }
  return "#F97316";
}

/**
 * Returns the search modal footer navigation text.
 * For ITE: "Use arrow keys to navigate, Enter to open".
 * For ICS / IBE: incumbent "Navigate with 1-tap".
 */
export function getSearchFooterText(instituteCode: string): string {
  if ((instituteCode || "").toLowerCase() === "ite") {
    return "Use arrow keys to navigate, Enter to open";
  }
  return "Navigate with 1-tap";
}

/**
 * Returns the welcome banner portal badge text.
 * For ITE: overrides stale database seed name to "Institute of Teacher Education".
 * For ICS / IBE: preserves database / theme institute name exactly.
 */
export function getWelcomeBannerPortalLabel(
  instituteCode: string,
  defaultName: string,
  isTeacher: boolean = false
): string {
  const isIte = (instituteCode || "").toLowerCase() === "ite";
  const displayName = isIte ? "Institute of Teacher Education" : defaultName;
  return isTeacher ? `${displayName} • Faculty Portal` : `${displayName} · Portal`;
}

/**
 * Returns the cursor color for the welcome banner.
 * For ITE: theme primary accent (blue #2563EB).
 * For ICS / IBE: incumbent default orange (#FF7517).
 */
export function getBannerCursorColor(
  instituteCode: string,
  primaryThemeColor?: string
): string {
  if ((instituteCode || "").toLowerCase() === "ite") {
    return primaryThemeColor || "#2563EB";
  }
  return "#FF7517";
}
