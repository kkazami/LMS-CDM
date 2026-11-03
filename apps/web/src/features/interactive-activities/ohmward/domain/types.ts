export type ModuleId = 'circuitry' | 'sensors' | 'microcontrollers' | 'integration';
export type ComponentKind = 'battery' | 'resistor' | 'led' | 'switch' | 'ground' | 'capacitor';
export type Endpoint = { componentId: string; terminalId: string };
export type CircuitWire = { id: string; from: Endpoint; to: Endpoint };
export type GateKind = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR' | 'XNOR';
export type GraphKind = 'battery' | 'resistor' | 'led' | 'switch' | 'input' | 'output' | 'uno' | 'button' | 'light-sensor' | 'temperature-sensor' | 'ultrasonic-sensor' | 'soil-sensor' | 'pump-driver' | 'pump' | GateKind;
export type GraphComponent = { id: string; kind: GraphKind; position: { x: number; y: number }; properties: { value?: number; channel?: number } };
export type SensorKind = 'light' | 'temperature' | 'ultrasonic' | 'pir' | 'ir' | 'soil';
export type Environment = { lightPercent: number; temperatureC: number; distanceCm: number; motion: number; reflectancePercent: number; moisturePercent: number };
export type GraphWorkspace = { version: 1; components: GraphComponent[]; environment: Environment };
export type PinMode = 'INPUT' | 'INPUT_PULLUP' | 'OUTPUT';
export type ControllerSource = 'digital' | 'analog' | 'lightPercent' | 'temperatureC' | 'distanceCm' | 'moisturePercent';
export type ControllerCondition = { source: ControllerSource; pin: string; operator: 'lt' | 'lte' | 'eq' | 'gte' | 'gt'; threshold: number };
export type Instruction =
  | { id: string; op: 'mode'; pin: string; mode: PinMode }
  | { id: string; op: 'write'; pin: string; value: number }
  | { id: string; op: 'pwm'; pin: string; value: number }
  | { id: string; op: 'map'; inputPin: string; outputPin: string }
  | { id: string; op: 'wait'; ms: number }
  | { id: string; op: 'if'; condition: ControllerCondition; then: Instruction[]; else: Instruction[] };
export type ControllerProgram = { version: 1; instructions: Instruction[]; repeat: boolean; horizonMs: number };
export type ResponseState = { answers: Record<string, string>; wires: CircuitWire[]; switchClosed: boolean; graph?: GraphWorkspace; controller?: ControllerProgram };
export type LessonCard = { title: string; body: string };
export type Choice = { id: string; label: string };
export type Question = { id: string; prompt: string; drawing?: { paths: string[]; description: string }; choices: Choice[]; numeric?: { unit: string; minimum: number; maximum: number; tolerance: number } };
export type CircuitPart = { id: string; kind: ComponentKind; label: string; terminals: { id: string; label: string }[] };
export type Level = {
  id: string; version: number; moduleId: ModuleId; number: number; title: string; objective: string;
  minutes: number; kind: 'identify' | 'match' | 'connect' | 'quiz' | 'numeric' | 'experiment' | 'circuit-build' | 'logic-build' | 'controller-build' | 'instruction-order'; lessons: LessonCard[];
  practice: { instruction: string; explanation: string };
  variants: { id: string; instruction: string; questions: Question[]; parts: CircuitPart[]; values: Record<string, number> }[];
  references: { title: string; url: string }[]; simplifications: string[];
};
export type Criterion = { id: string; concept: string; passed: boolean; points: number; possible: number; mandatory: boolean; feedback: string };
export type Grade = { score: number; passed: boolean; stars: number; criteria: Criterion[]; misconceptions: string[] };
export type Progress = { levelId: string; bestScore: number; bestStars: number; firstPassedAt: string | null; submittedCount: number };
export type Attempt = {
  id: string; levelId: string; contentVersion: number; variantId: string; status: 'IN_PROGRESS' | 'SUBMITTED' | 'ABANDONED';
  revision: number; state: ResponseState; hintIds: string[]; revealedHints: string[]; result: Grade | null;
  startedAt: string; submittedAt: string | null;
};
export const EMPTY_STATE: ResponseState = { answers: {}, wires: [], switchClosed: true };
export const DEFAULT_ENVIRONMENT: Environment = { lightPercent: 50, temperatureC: 25, distanceCm: 100, motion: 0, reflectancePercent: 50, moisturePercent: 50 };
