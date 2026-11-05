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
  shape: Shape | Shape[];
  anchor: { x: number; y: number };
  colorKey: string;
  function: string;
  details: string;
  funFact?: string;
  teachingTip: string;
  commonMisconception?: string;
}

export interface Diagram {
  id: string;
  title: string;
  area: ScienceArea;
  summary: string;
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

