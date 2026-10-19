export const LINK_LIFETIME_MS = 72 * 3600000;
export const REMINDER_DELAY_MS = 48 * 3600000;
export const RETRY_DELAYS_MS = [60000, 15 * 60000, 3600000, 6 * 3600000];
export function pendingStudent(user: {
  role: string;
  isActive: boolean;
  activationStatus: string;
}) {
  return (
    user.role.toUpperCase() === "STUDENT" &&
    user.isActive &&
    user.activationStatus === "PENDING_ACTIVATION"
  );
}
export function grantMatches(
  grant: {
    email: string;
    invitationVersion: number;
    expiresAt: Date;
    consumedAt: Date | null;
    revokedAt: Date | null;
  },
  user: {
    email: string;
    invitationVersion: number;
    role: string;
    isActive: boolean;
    activationStatus: string;
  },
  now = new Date(),
) {
  return (
    pendingStudent(user) &&
    grant.email === user.email &&
    grant.invitationVersion === user.invitationVersion &&
    !grant.consumedAt &&
    !grant.revokedAt &&
    grant.expiresAt > now
  );
}
export function escapeHtml(text: string) {
  return text.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
}
export function estimateDelivery(
  attempts: number[],
  queueLength: number,
  cap: number,
  now: number,
  scheduled: number[] = [],
) {
  const reservations = attempts
    .filter((t) => t > now - 86400000)
    .sort((a, b) => a - b);
  let at = now;
  for (let i = 0; i < queueLength; i++) {
    at = Math.max(at, scheduled[i] ?? now);
    while (reservations.length && reservations[0] <= at - 86400000)
      reservations.shift();
    if (reservations.length >= cap)
      at = Math.max(at, reservations[reservations.length - cap] + 86400000 + 1);
    while (reservations.length && reservations[0] <= at - 86400000)
      reservations.shift();
    reservations.push(at);
    if (i % 5 === 4 && i < queueLength - 1) at += 60000;
  }
  return at;
}
