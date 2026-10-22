export type InstituteCode = 'ics' | 'ibe' | 'ite';

/** Keep existing roster names consistent with the current institute identity. */
export function getInstituteName(code: string | null | undefined, storedName: string): string {
  return code?.toLowerCase() === 'ics' ? 'Institute of Computing Studies' : storedName;
}

export interface Institute {
  id: string;
  code: InstituteCode;
  name: string;
}
