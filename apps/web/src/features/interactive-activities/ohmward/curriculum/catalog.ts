import type { ComponentKind, Level, ModuleId } from '../domain/types';
import { SPRINT2_LEVELS } from './sprint2';
import { SPRINT3_LEVELS } from './sprint3';
import { SPRINT4_LEVELS } from './sprint4';

export const MODULES: { id: ModuleId; title: string; description: string; titles: string[] }[] = [
  { id: 'circuitry', title: 'Circuitry', description: 'Recognize parts. Close a loop. Understand the flow.', titles: ['Meet the symbols', 'A purpose for every part', 'Close the loop', 'Protect the light', 'Series and parallel', 'Circuit detective', 'Choose the resistance', 'Think in logic'] },
  { id: 'sensors', title: 'Sensors', description: 'Turn a changing environment into useful information.', titles: ['Meet the sensors', 'What are we measuring?', 'Analog and digital', 'Explore the readings', 'Choose your sensor', 'Predict the change', 'Timing and thresholds', 'Find the faulty reading'] },
  { id: 'microcontrollers', title: 'Microcontrollers', description: 'Connect inputs, make decisions, control outputs.', titles: ['Meet the board', 'Know your pins', 'Power and ground', 'Control an LED', 'Make it blink', 'A button makes a choice', 'From analog to PWM', 'Debug the controller'] },
  { id: 'integration', title: 'System integration', description: 'Bring the whole system together.', titles: ['Trace the journey', 'Automatic night lamp', 'Temperature alarm', 'Parking assistant', 'Which layer failed?', 'Automatic plant watering'] },
];
export const PREFIXES: Record<ModuleId, string> = { circuitry: 'CIR', sensors: 'SEN', microcontrollers: 'MCU', integration: 'INT' };
export const COMPONENTS: { id: ComponentKind; name: string; function: string }[] = [
  { id: 'battery', name: 'Battery', function: 'Provides a potential difference that can drive current around a complete circuit.' },
  { id: 'resistor', name: 'Resistor', function: 'Limits current and produces a voltage drop when current passes through it.' },
  { id: 'led', name: 'LED', function: 'Emits light when an appropriate forward current passes through it.' },
  { id: 'switch', name: 'Switch', function: 'Opens or closes a conducting path.' },
  { id: 'ground', name: 'Ground', function: 'Marks the chosen reference potential; often connected to the supply return.' },
  { id: 'capacitor', name: 'Capacitor', function: 'Stores energy in an electric field between its plates.' },
];
const references = [
  { title: 'OpenStax University Physics, Volume 2 — circuit diagrams and DC circuits', url: 'https://openstax.org/books/university-physics-volume-2/pages/10-introduction' },
  { title: 'Arduino — Blink: external LED and resistor', url: 'https://docs.arduino.cc/built-in-examples/basics/Blink/' },
];
const lessons = [
  { title: 'A symbol is a shared language', body: 'A schematic uses symbols to describe electrical connections. It is a map of a circuit, not a photograph of where the parts sit.' },
  { title: 'Six useful starting points', body: 'A battery supplies a potential difference. A resistor limits current. An LED emits light. A switch opens or closes a path. Ground marks a chosen reference. A capacitor stores energy in an electric field.' },
  { title: 'Look for the details', body: 'The long battery line marks the positive terminal. An LED symbol is a diode with arrows pointing outward; the bar marks its cathode. The resistor here uses a zigzag symbol; a rectangle is also used in other notation.' },
];
const parts: Level['variants'][number]['parts'] = [
  { id: 'supply', kind: 'battery', label: 'Battery', terminals: [{ id: 'positive', label: '+' }, { id: 'negative', label: '−' }] },
  { id: 'control', kind: 'switch', label: 'Switch', terminals: [{ id: 'left', label: '1' }, { id: 'right', label: '2' }] },
  { id: 'limit', kind: 'resistor', label: 'Current-limiting resistor', terminals: [{ id: 'left', label: '1' }, { id: 'right', label: '2' }] },
  { id: 'light', kind: 'led', label: 'LED', terminals: [{ id: 'anode', label: 'Anode (+)' }, { id: 'cathode', label: 'Cathode (−)' }] },
];
const variants = ['a', 'b'] as const;
// Assessment presentation contains geometry, not the accepted component identifier.
const symbolQuestions = [
  { id: 'q17', drawing: { paths: ['M8 36H29M43 36H64M29 16V56M43 25V47','M18 18H24M21 15V21'], description: 'Two parallel vertical lines of unequal length, with an external wire on each side. A plus mark is beside the longer line.' } },
  { id: 'q42', drawing: { paths: ['M5 36H16L20 25L27 47L34 25L41 47L48 25L54 36H67'], description: 'A zigzag line between two straight wire segments.' } },
  { id: 'q08', drawing: { paths: ['M6 40H22M49 40H65M22 26L47 40L22 54ZM48 26V54M38 19L49 8M45 8H49V12M50 23L61 12M57 12H61V16'], description: 'A diode shape pointing toward a vertical bar, with two small arrows pointing outward from the shape.' } },
  { id: 'q63', drawing: { paths: ['M5 43H22M50 43H67M24 40L48 22M19 43A3 3 0 1 0 25 43A3 3 0 1 0 19 43M47 43A3 3 0 1 0 53 43A3 3 0 1 0 47 43'], description: 'Two wire contacts separated by a gap, with a tilted movable line attached to the left contact.' } },
  { id: 'q29', drawing: { paths: ['M36 7V34M14 34H58M21 44H51M28 54H44'], description: 'A vertical wire meets three stacked horizontal lines that become shorter toward the bottom.' } },
  { id: 'q51', drawing: { paths: ['M5 36H29M43 36H67M29 18V54M43 18V54'], description: 'Two parallel vertical plates of equal length, separated by a gap, with a wire on each side.' } },
];
export const LEVELS: Level[] = [
  { id: 'CIR-01', version: 1, moduleId: 'circuitry', number: 1, title: 'Meet the symbols', objective: 'Recognize six circuit symbols and the details that distinguish them.', minutes: 6, kind: 'identify', lessons,
    practice: { instruction: 'Select each part in the explorer. Read its purpose, then recognize its symbol.', explanation: 'Schematics describe connections using a shared visual language. Different drawing conventions can represent the same component.' },
    variants: variants.map((id, index) => ({ id, instruction: 'Name each symbol. Answer at least five of the six correctly to pass.', parts: [], values: {}, questions: (index ? [...symbolQuestions].reverse() : symbolQuestions).map(question => ({ ...question, prompt: 'Which component does this symbol represent?', choices: (index ? [...COMPONENTS].slice(2).concat(COMPONENTS.slice(0, 2)) : COMPONENTS).map(option => ({ id: option.id, label: option.name })) })) })), references,
    simplifications: ['Only six introductory schematic symbols are assessed.', 'A symbol does not show physical size, package, or component ratings.'] },
  { id: 'CIR-02', version: 1, moduleId: 'circuitry', number: 2, title: 'A purpose for every part', objective: 'Match circuit components to their electrical roles.', minutes: 6, kind: 'match',
    lessons: [
      { title: 'Supply, control, and response', body: 'The battery supplies energy. The switch controls whether there is a complete path. The LED is an output: it converts some electrical energy into light.' },
      { title: 'Protect and store', body: 'An LED needs current limiting. A series resistor limits its current. A capacitor stores energy in an electric field; it is not an unlimited source of energy.' },
      { title: 'A reference, not magic', body: 'Ground is a chosen voltage reference. In this battery-powered lesson it means the supply return. A ground symbol by itself does not power a circuit or replace a missing physical connection.' },
    ], practice: { instruction: 'Explore the six parts and their purposes. In the challenge, select a component and its function, or drag it into a function row.', explanation: 'A part’s role explains why it belongs in a circuit. Use the function, not the part’s appearance, to make the match.' },
    variants: variants.map((id, index) => ({ id, instruction: 'Assign a component to each function. At least five of six matches must be correct.', parts: [], values: {}, questions: (index ? [...COMPONENTS].reverse() : COMPONENTS).map((part, position) => ({ id: `role-${position}`, prompt: part.function, choices: COMPONENTS.map(option => ({ id: option.id, label: option.name })) })) })), references,
    simplifications: ['These are introductory roles, not exhaustive component specifications.', 'Capacitor charging and discharging are not simulated in this release.'] },
  { id: 'CIR-03', version: 1, moduleId: 'circuitry', number: 3, title: 'Close the loop', objective: 'Build a complete, correctly polarized LED loop with a series resistor and a switch.', minutes: 8, kind: 'connect',
    lessons: [
      { title: 'Current needs a complete path', body: 'Connect battery positive through the switch, resistor, and LED, then return to battery negative. Closing the switch completes the path. Opening it interrupts the path and turns the LED off.' },
      { title: 'Protect the LED', body: 'An LED is not a resistor. Put a current-limiting resistor in series with it. In this simple loop, the switch and resistor can change order without changing the result.' },
      { title: 'Direction matters', body: 'Conventional current travels from battery positive toward negative through the external circuit. Connect the LED anode toward positive and cathode toward negative. Electron motion in metal is in the opposite direction.' },
      { title: 'Our model', body: 'The LED uses a fixed 2 V forward drop. Current is estimated as (battery voltage − 2 V) / resistance. Real LEDs and batteries vary. This lesson checks one supported series loop, not arbitrary circuit physics.' },
    ], practice: { instruction: 'Try the switch on a preconnected example. The resistor protects the LED. Observe what changes when the path opens.', explanation: 'The LED only lights when the entire path is closed and its polarity is correct. A missing connection stops current throughout this series loop.' },
    variants: variants.map((id, index) => ({ id, instruction: 'Connect all four components into one series loop. Use every terminal exactly once. Then test both switch positions before submitting.', questions: [], parts, values: { supplyVolts: index ? 5 : 3, ledForwardVolts: 2, resistanceOhms: index ? 330 : 220, maximumCurrentMilliamps: 20 } })), references,
    simplifications: ['Fixed parts and a single series loop only; branch networks are unsupported here.', 'LED forward voltage is fixed at 2 V; brightness is qualitative.', 'Test evaluation checks closed and open switch behavior independently of the currently selected switch state.'] },
  ...SPRINT2_LEVELS,
  ...SPRINT3_LEVELS,
  ...SPRINT4_LEVELS,
];

export const PRIMER = {
  id: 'PRIMER', version: 1, title: 'A small light. A complete system.', minutes: 5,
  cards: [
    { title: 'Start with power', body: 'A battery supplies a potential difference. A complete conducting path lets current flow. Our example includes a resistor to limit LED current.' },
    { title: 'Sense the environment', body: 'A light-sensor module converts changing brightness into a reading. Here, 0% means dark and 100% means bright: a normalized educational model.' },
    { title: 'Make a decision', body: 'A microcontroller reads the sensor and compares it with a threshold. In this example the rule is: if light is below 35%, turn the lamp on; otherwise turn it off.' },
    { title: 'See the response', body: 'With power connected and the switch closed, the LED turns on below 35%. At exactly 35% it stays off. The sensor supplies information; the power circuit supplies energy.' },
  ], hints: ['Try 20% light with the switch closed.', 'Open the switch: correct logic cannot power a broken circuit.', 'At 35%, the strict less-than condition is false.'],
  references, simplifications: ['Normalized sensor-module reading, not a physical LDR resistance curve.', 'Simplified controller rule and fixed protected LED circuit.'],
};

export function getLevel(id: string, version = 1): Level | undefined { return LEVELS.find(level => level.id === id && level.version === version); }
export function levelId(moduleId: ModuleId, index: number) { return `${PREFIXES[moduleId]}-${String(index + 1).padStart(2, '0')}`; }
export function challengeUnlocked(id: string, primer: boolean, passed: readonly string[]): boolean {
  const level = getLevel(id); if (!level || !primer) return false;
  if(level.moduleId==='integration'&&!integrationReady(passed))return false;
  if (level.number === 1) return true;
  return passed.includes(`${PREFIXES[level.moduleId]}-${String(level.number - 1).padStart(2, '0')}`);
}
export function integrationReady(passed:readonly string[]):boolean {return ['CIR','SEN','MCU'].every(prefix=>Array.from({length:6},(_,i)=>`${prefix}-${String(i+1).padStart(2,'0')}`).every(id=>passed.includes(id)));}
export function missingPrerequisites(level:Level,primer:boolean,passed:readonly string[]):{label:string;href:string}[]{
  const result:{label:string;href:string}[]=[];
  if(!primer)result.push({label:'Complete the introduction',href:'/ics/activities/ohmward/primer'});
  if(level.moduleId==='integration')for(const module of ['circuitry','sensors','microcontrollers'] as const){const missing=Array.from({length:6},(_,i)=>levelId(module,i)).find(id=>!passed.includes(id));if(missing)result.push({label:`Pass ${missing} · ${getLevel(missing)!.title}`,href:`/ics/activities/ohmward/levels/${missing}`});}
  if(level.number>1){const previous=levelId(level.moduleId,level.number-2);if(!passed.includes(previous)&&!result.some(item=>item.href.endsWith('/'+previous)))result.push({label:`Pass ${previous} · ${getLevel(previous)!.title}`,href:`/ics/activities/ohmward/levels/${previous}`});}
  return result;
}
