export const reportAreas = {
  dashboard: 'Dashboard',
  courses: 'Courses and assignments',
  materials: 'Learning materials',
  grades: 'Grades',
  calendar: 'Tasks and calendar',
  announcements: 'Announcements and discussions',
  activities: 'Labs and study tools',
  account: 'Sign-in and account',
  other: 'Somewhere else',
} as const;

export const reportLimits = { title: 120, description: 3000, steps: 2000, attachment: 4 * 1024 * 1024 };

export const reportFileTypes = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
} as const;

export function reportFileType(name: string) {
  const extension = name.slice(name.lastIndexOf('.') + 1).toLowerCase();
  return name.includes('.') && Object.hasOwn(reportFileTypes, extension)
    ? reportFileTypes[extension as keyof typeof reportFileTypes]
    : null;
}
