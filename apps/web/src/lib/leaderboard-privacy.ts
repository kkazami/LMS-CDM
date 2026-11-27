import { profilePreferences } from '@/lib/profile-banner';

export const leaderboardVisibilityOptions = ['name', 'photo', 'anonymous'] as const;
export type LeaderboardVisibility = (typeof leaderboardVisibilityOptions)[number];
export const leaderboardPhotoPreference = 'showLeaderboardPhoto';

type Privacy = { isLeaderboardAnonymized: boolean };

export function leaderboardVisibility(privacy?: Privacy | null, preferences?: string): LeaderboardVisibility {
  if (privacy?.isLeaderboardAnonymized) return 'anonymous';
  return preferences && profilePreferences(preferences)[leaderboardPhotoPreference] === true ? 'photo' : 'name';
}

export function leaderboardIdentity(
  student: { id: string; name: string; avatarUrl?: string | null; department?: string | null; preferences?: string },
  privacy: Privacy | null | undefined,
  position: number,
  viewerId?: string,
) {
  const visibility = leaderboardVisibility(privacy, student.preferences);
  const isSelf = student.id === viewerId;
  const isAnonymized = visibility === 'anonymous';
  const hidden = isAnonymized && !isSelf;

  return {
    studentId: hidden ? `anonymous-${position}` : student.id,
    name: hidden ? 'Anonymous student' : student.name,
    avatarUrl: visibility === 'photo' ? student.avatarUrl ?? null : null,
    department: hidden ? '' : student.department || '',
    isSelf,
    isAnonymized,
  };
}
