export function isIteUser(user?: { institute?: { code?: string } } | null): boolean {
  if (!user?.institute?.code) return false;
  return user.institute.code.trim().toLowerCase() === 'ite';
}

export function isIcsUser(user?: { institute?: { code?: string } } | null): boolean {
  if (!user?.institute?.code) return false;
  return user.institute.code.trim().toLowerCase() === 'ics';
}

export function isIbeUser(user?: { institute?: { code?: string } } | null): boolean {
  if (!user?.institute?.code) return false;
  return user.institute.code.trim().toLowerCase() === 'ibe';
}

export function isBsbaHrmUser(user?: { institute?: { code?: string }; department?: string | null } | null): boolean {
  if (!isIbeUser(user)) return false;
  const dept = (user?.department || '').trim().toUpperCase();
  return dept.includes('HRM') || dept.includes('HUMAN RESOURCE') || dept === 'BSBA HRM';
}

export function isBsEntrepUser(user?: { institute?: { code?: string }; department?: string | null } | null): boolean {
  if (!isIbeUser(user)) return false;
  const dept = (user?.department || '').trim().toUpperCase();
  return dept.includes('ENTREP') || dept.includes('ENTREPRENEURSHIP') || dept === 'BS ENTREP';
}
