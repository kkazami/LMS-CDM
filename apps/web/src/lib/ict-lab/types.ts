export interface HardwareCategory {
  id: string;
  label: string;
}

export interface HardwarePart {
  id: string;
  name: string;
  category: string;
  function: string;
  description: string;
  connectsTo: string[];
}

export interface HardwarePartsData {
  categories: HardwareCategory[];
  parts: HardwarePart[];
}

export type LanPalette = Record<string, string>;

export interface LanWire {
  id: string;
  label: string;
  pair: string;
  striped: boolean;
}

export interface LanStandardPin {
  pin: number;
  wire: string;
}

export interface LanStandard {
  id: string;
  name: string;
  pins: LanStandardPin[];
}

export interface LanCableType {
  id: string;
  name: string;
  wiring: string;
  usedFor: string;
  testerPattern: [number, number][];
}

export interface LanTool {
  id: string;
  name: string;
  use: string;
}

export interface LanCrimpingStep {
  step: number;
  title: string;
  detail: string;
}

export interface LanFault {
  id: string;
  name: string;
  meaning: string;
}

export interface LanCableData {
  palette: LanPalette;
  wires: LanWire[];
  standards: LanStandard[];
  pinOrientationNote: string;
  cableTypes: LanCableType[];
  facts: string[];
  tools: LanTool[];
  crimpingSteps: LanCrimpingStep[];
  faults: LanFault[];
}

export interface PlaygroundExampleSnippet {
  id: string;
  title: string;
  description: string;
  html: string;
  css: string;
  js: string;
}

