// Bundle the square artwork so mobile previews do not depend on a web deployment.
export const mobileCourseBanners = [
  { id: 'programming', label: 'Programming', source: require('../../assets/course-banners/mobile/programming.webp') },
  { id: 'database', label: 'Database', source: require('../../assets/course-banners/mobile/database.webp') },
  { id: 'networking', label: 'Networking', source: require('../../assets/course-banners/mobile/networking.webp') },
  { id: 'webdev', label: 'Web development', source: require('../../assets/course-banners/mobile/webdev.webp') },
  { id: 'cybersecurity', label: 'Cybersecurity', source: require('../../assets/course-banners/mobile/cybersecurity.webp') },
].map(banner => ({ ...banner, value: `/course-banners/mobile/${banner.id}.svg` }));

const wideCourseBanners: Record<string, number> = {
  '/course-banners/programming.svg': require('../../assets/course-banners/programming.webp'),
  '/course-banners/database.svg': require('../../assets/course-banners/database.webp'),
  '/course-banners/networking.svg': require('../../assets/course-banners/networking.webp'),
  '/course-banners/webdev.svg': require('../../assets/course-banners/webdev.webp'),
  '/course-banners/cybersecurity.svg': require('../../assets/course-banners/cybersecurity.webp'),
};

export function bundledCourseBannerSource(value?: string | null) {
  if (!value) return undefined;
  return mobileCourseBanners.find(banner => banner.value === value)?.source
    ?? (Object.hasOwn(wideCourseBanners, value) ? wideCourseBanners[value] : undefined);
}
