// An epoch also separates two sessions for the same student.
let owner: string | null = null;
let epoch = 0;
export function setStudentScope(next: string | null) {
  owner = next;
  epoch += 1;
}
export function studentScope() { return { owner, epoch }; }
export function scopeIsCurrent(scope: ReturnType<typeof studentScope>) {
  return scope.owner !== null && scope.owner === owner && scope.epoch === epoch;
}
export function studentOwner(user: { id: string; institute: { code: string } }) {
  return `${user.institute.code}:${user.id}`;
}
