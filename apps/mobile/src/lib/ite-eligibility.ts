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
