// Bundle the square artwork so mobile previews do not depend on a web deployment.
export const mobileCourseBanners = [
  { id: 'programming', label: 'Programming', source: require('../../../web/public/course-banners/mobile/programming.svg') },
  { id: 'database', label: 'Database', source: require('../../../web/public/course-banners/mobile/database.svg') },
  { id: 'networking', label: 'Networking', source: require('../../../web/public/course-banners/mobile/networking.svg') },
  { id: 'webdev', label: 'Web development', source: require('../../../web/public/course-banners/mobile/webdev.svg') },
  { id: 'cybersecurity', label: 'Cybersecurity', source: require('../../../web/public/course-banners/mobile/cybersecurity.svg') },
].map(banner => ({ ...banner, value: `/course-banners/mobile/${banner.id}.svg` }));

export function mobileCourseBannerSource(value?: string | null) {
  return mobileCourseBanners.find(banner => banner.value === value)?.source;
}
