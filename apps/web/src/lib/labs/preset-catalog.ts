/** Instructor-facing starter choices. Creating one makes a private, editable ICS draft. */
export const LAB_PRESET_KEYS = [
  'MYSQL', 'UBUNTU', 'ROUTER', 'RJ45', 'FIBER',
  'WINDOWS_SERVER_SETUP', 'WINDOWS_SERVER_ADDS_DNS', 'WINDOWS_SERVER_DHCP', 'WINDOWS_SERVER_BACKUP',
] as const;
export type LabPresetKey = (typeof LAB_PRESET_KEYS)[number];

export const LAB_PRESET_COLLECTIONS = [
  { key: 'CORE', title: 'Core practical labs', description: 'Database, operating system, networking, and cabling examples.' },
  { key: 'WINDOWS_SERVER', title: 'Microsoft Windows Server', description: 'Begin with initial setup, then AD DS and DNS, then DHCP. Backup and recovery can be practiced separately. Use approved training VMs.' },
] as const;

export const LAB_PRESET_OPTIONS = [
  { key: 'MYSQL', collection: 'CORE', startLabel: 'MySQL', title: 'Initialize a MySQL database', category: 'Database', summary: 'Create a local database, inspect a table, and explain the result.', minutes: 30 },
  { key: 'UBUNTU', collection: 'CORE', startLabel: 'Ubuntu', title: 'Install Ubuntu in a virtual machine', category: 'Operating systems', summary: 'Install and verify Ubuntu in an instructor-approved VM.', minutes: 50 },
  { key: 'ROUTER', collection: 'CORE', startLabel: 'router', title: 'Configure a lab router LAN interface', category: 'Networking', summary: 'Set one assigned interface and verify local connectivity.', minutes: 40 },
  { key: 'RJ45', collection: 'CORE', startLabel: 'RJ45', title: 'Crimp and test an RJ45 patch cable', category: 'Hardware', summary: 'Wire both ends consistently and check the cable with a tester.', minutes: 45 },
  { key: 'FIBER', collection: 'CORE', startLabel: 'fiber optics', title: 'Terminate and test a fiber-optic connector', category: 'Hardware', summary: 'Use a supervised training kit and document the test result.', minutes: 60 },
  { key: 'WINDOWS_SERVER_SETUP', collection: 'WINDOWS_SERVER', startLabel: 'server setup', title: 'Configure Windows Server initial settings', category: 'Server configuration', summary: 'Set a unique name, static IP and DNS settings, and Windows Update policy.', minutes: 50 },
  { key: 'WINDOWS_SERVER_ADDS_DNS', collection: 'WINDOWS_SERVER', startLabel: 'AD DS & DNS', title: 'Install AD DS and DNS in a new lab forest', category: 'Server configuration', summary: 'Install AD DS, promote a new lab domain controller, and verify DNS.', minutes: 75 },
  { key: 'WINDOWS_SERVER_DHCP', collection: 'WINDOWS_SERVER', startLabel: 'DHCP', title: 'Install DHCP and verify a lab client lease', category: 'Server configuration', summary: 'Authorize DHCP, configure a scope, and verify an isolated client lease.', minutes: 60 },
  { key: 'WINDOWS_SERVER_BACKUP', collection: 'WINDOWS_SERVER', startLabel: 'server backup', title: 'Back up and recover Windows Server lab files', category: 'Server configuration', summary: 'Install Windows Server Backup, save sample files, and test a recovery.', minutes: 60 },
] as const satisfies readonly {
  key: LabPresetKey; collection: (typeof LAB_PRESET_COLLECTIONS)[number]['key'];
  startLabel: string; title: string; category: string; summary: string; minutes: number;
}[];
