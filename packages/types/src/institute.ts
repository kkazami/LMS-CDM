export type InstituteCode = 'ics' | 'ibe' | 'ite';

/** Keep existing roster names consistent with the current institute identity. */
export function getInstituteName(code: string | null | undefined, storedName?: string | null): string {
  const norm = code?.toLowerCase().trim();
  if (norm === 'ics') return 'Institute of Computing Studies';
  if (norm === 'ite') return 'Institute of Teacher Education';
  if (storedName && /technology\s*(?:and|&)\s*engineering/i.test(storedName)) {
    return 'Institute of Teacher Education';
  }
  return storedName ?? '';
}

export interface Institute {
  id: string;
  code: InstituteCode;
  name: string;
}
