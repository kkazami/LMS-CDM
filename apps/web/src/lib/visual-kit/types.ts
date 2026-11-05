export type ScienceArea =
  | "Human anatomy"
  | "Biological systems"
  | "Physical processes";

export type ShapeType =
  | "rect"
  | "ellipse"
  | "circle"
  | "path"
  | "polygon"
  | "line"
  | "text";

export interface Shape {
  type: ShapeType;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  r?: number;
  rx?: number;
  ry?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
  d?: string;
  points?: string;
  text?: string;
  fontSize?: number;
  stroke?: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  strokeLinecap?: "butt" | "round" | "square";
  fill?: string;
  opacity?: number;
  transform?: string;
  colorKey?: string;
  className?: string;
}

export interface Part {
  id: string;
  name: string;
  shape?: Shape | Shape[];
  /** Hotspot anchor coordinate in percentage (0 to 100) relative to image container */
  anchor: { x: number; y: number };
  colorKey?: string;
  function: string;
  details: string;
  funFact?: string;
  teachingTip: string;
  commonMisconception?: string;
}

export interface DiagramAttribution {
  sourceTitle: string;
  author: string;
  sourceUrl?: string;
  licenseName?: string;
  licenseUrl?: string;
  viaText?: string;
  notes?: string;
}

export interface CoverBox {
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
}

export interface Diagram {
  id: string;
  title: string;
  area: ScienceArea;
  summary: string;
  /** Static illustration asset path under /visual-kit/ */
  imageSrc?: string;
  imageAlt?: string;
  aspectRatio?: string;
  attribution?: DiagramAttribution;
  /** Percentage-based cover boxes rendered in 'label' mode to hide printed diagram text */
  coverBoxes?: CoverBox[];
  viewBox: { w: number; h: number };
  parts: Part[];
  decorations: Shape[];
  discussionQuestions: string[];
  supportsCircuitToggle?: boolean;
}

export interface LabelingAnswerState {
  markerIndex: number;
  partId: string;
  selectedName: string | null;
  isCorrect?: boolean;
}

export interface BestScoreRecord {
  score: number;
  total: number;
  percentage: number;
  completedAt: string;
}

export interface BestScoresPayload {
  version: number;
  scores: Record<string, BestScoreRecord>;
}
