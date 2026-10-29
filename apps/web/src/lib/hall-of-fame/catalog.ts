import { ENTREPRENEUR_PROFILES } from "./entrepreneurs-data";
import { HR_LEADER_PROFILES } from "./hr-leaders-data";
import type {
  HallOfFameCategory,
  HallOfFameProfile,
  HallOfFameSubject,
  ProfileOrigin,
} from "./types";

export { ENTREPRENEUR_PROFILES, HR_LEADER_PROFILES };

export const HALL_OF_FAME_PROFILES: readonly HallOfFameProfile[] = [
  ...ENTREPRENEUR_PROFILES,
  ...HR_LEADER_PROFILES,
];

export function getProfileById(id: string): HallOfFameProfile | undefined {
  return HALL_OF_FAME_PROFILES.find((profile) => profile.id === id);
}

export function getProfilesByCategory(
  category: HallOfFameCategory
): readonly HallOfFameProfile[] {
  return category === "ENTREPRENEUR" ? ENTREPRENEUR_PROFILES : HR_LEADER_PROFILES;
}

export function getNextProfileInCategory(
  currentProfile: HallOfFameProfile
): HallOfFameProfile {
  const list = getProfilesByCategory(currentProfile.category);
  const idx = list.findIndex((item) => item.id === currentProfile.id);
  if (idx === -1) return list[0]!;
  return list[(idx + 1) % list.length]!;
}

export interface HallOfFameFilterOptions {
  category?: HallOfFameCategory | "ALL";
  origin?: ProfileOrigin | "ALL";
  subject?: HallOfFameSubject | "ALL";
  search?: string;
}

export function filterHallOfFameProfiles(
  options: HallOfFameFilterOptions = {}
): HallOfFameProfile[] {
  const category = options.category ?? "ALL";
  const origin = options.origin ?? "ALL";
  const subject = options.subject ?? "ALL";
  const query = (options.search ?? "").trim().toLowerCase();

  return HALL_OF_FAME_PROFILES.filter((profile) => {
    if (category !== "ALL" && profile.category !== category) return false;
    if (origin !== "ALL" && profile.origin !== origin) return false;
    if (
      subject !== "ALL" &&
      !profile.relatedSubjects.some((item) => item.subject === subject)
    ) {
      return false;
    }

    if (query) {
      const searchable = [
        profile.fullName,
        profile.countryLabel,
        profile.professionRole,
        profile.organization,
        profile.featuredAchievementBadge,
        profile.whyTheyMatterSummary,
        profile.shortBiography,
        profile.whyFamous,
        ...profile.majorAchievements.map(
          (a) => `${a.title} ${a.explanation} ${a.period}`
        ),
        ...profile.relatedSubjects.map((s) => s.subject),
      ]
        .join(" ")
        .toLowerCase();

      if (!searchable.includes(query)) return false;
    }

    return true;
  });
}

export function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

