export type InstituteCode = 'ics' | 'ibe' | 'ite';

export interface Institute {
  id: string;
  code: InstituteCode;
  name: string;
}
