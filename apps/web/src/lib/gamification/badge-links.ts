export const BADGES_EARNED_EVENT = 'lms:badges-earned';

export function earnedBadgeHref(instituteCode: string, badgeRuleId: string) {
  const query = new URLSearchParams({ view: 'earned', badge: badgeRuleId });
  return `/${encodeURIComponent(instituteCode.toLowerCase())}/achievements?${query}`;
}
