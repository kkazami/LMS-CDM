export type InstituteCode = 'ics' | 'ibe' | 'ite';

/** Keep existing roster names consistent with the current institute identity. */
export function getInstituteName(code: string | null | undefined, storedName: string): string {
  const c = code?.toLowerCase();
  if (c === 'ics') return 'Institute of Computing Studies';
  if (c === 'ibe') return 'Institute of Business and Entrepreneurship';
  if (c === 'ite') return 'Institute of Teacher Education';
  return storedName;
}

export interface Institute {
  id: string;
  code: InstituteCode;
  name: string;
}
