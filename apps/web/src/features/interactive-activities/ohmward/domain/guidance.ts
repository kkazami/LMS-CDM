import type { Level, GraphKind } from './types';

export type GuideStep = { title: string; body: string; target: string; event: 'click' | 'change'; allAnswers?: boolean };
export type Guide = { title: string; steps: GuideStep[] };
export type PrerequisiteLink = { label: string; href: string };
const action = (title: string, body: string, target: string, event: GuideStep['event'] = 'click'): GuideStep => ({ title, body, target, event });
const at = (name: string) => `[data-ohm-tour="${name}"]`;
const continuePractice = action('Choose your next step', 'Click the outlined button to finish practice and open Build. This starts or resumes your saved challenge.', at('practice-next'));
const answers: GuideStep = { ...action('Answer the outlined question', 'Use your lesson to choose or enter an answer. The outline moves to the next unanswered question. Complete every row before continuing. This walkthrough does not choose answers for you.', at('answer'), 'change'), allAnswers: true };
const inspect = action('Find your new component', 'Your added part is selected and its properties appear in the inspector below the canvas. Click Fit view to bring the components into view without changing the circuit.', at('fit'));
const run = action('Test your work', 'Run the model and read its feedback. A local test explains your current work; your assessment is checked separately when you submit.', at('run'));
const board = action('Inspect a board pin', 'Click an outlined board pin to read its capabilities. Choose pins for your own design using the lesson and assigned requirements.', '.ohm-board-pin');

export const SANDBOX_UNLOCKS: { label: string; level: string; parts: GraphKind[] }[] = [
  { label: 'Battery, resistor, LED and switch', level: 'CIR-03', parts: ['battery', 'resistor', 'led', 'switch'] },
  { label: 'Boolean inputs, outputs and logic gates', level: 'CIR-08', parts: ['input', 'output', 'AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'] },
  { label: 'Uno board and controller instructions', level: 'MCU-04', parts: ['uno'] },
  { label: 'Button input', level: 'MCU-06', parts: ['button'] },
  { label: 'Light sensor module', level: 'MCU-07', parts: ['light-sensor'] },
  { label: 'Temperature sensor module', level: 'INT-03', parts: ['temperature-sensor'] },
  { label: 'Ultrasonic sensor module', level: 'INT-04', parts: ['ultrasonic-sensor'] },
  { label: 'Soil sensor, pump driver and pump', level: 'INT-06', parts: ['soil-sensor', 'pump-driver', 'pump'] },
];

export function levelGuide(level: Level, phase: number, locked = false, answered = false): Guide {
  if (phase === 0) return { title: 'Walk through Learn', steps: [action('Read, then try it', 'Read the lesson cards, then click Finish Learn to open ungraded practice. Later stages stay locked until you finish the preceding stage.', at('learn-next'))] };
  if (phase === 1) {
    let steps: GuideStep[];
    if (level.kind === 'identify' || level.kind === 'match') steps = [
      action('Open a component card', 'Click Resistor in the actual practice controls below. Its symbol and purpose will appear underneath. This step explores the cards only.', at('explore-resistor')),
      action('Explore another component', 'Now click LED to change the card. Explore the other parts whenever you want. Your graded matching rows will be in Build.', at('explore-led')),
    ];
    else if (level.moduleId === 'sensors') steps = [
      action('Select a sensor', 'Click this sensor button to open its reading and model description. It uses the same environment controls shown beside it.', at('sensor-tab')),
      action('Change the environment', 'Move the outlined slider with your pointer or arrow keys. Watch the sensor reading change with the environment.', at('environment'), 'change'),
      action('Compare the readings', 'Open the readings table to compare all six modules, including their units.', at('sensor-table')),
    ];
    else if (level.kind === 'controller-build' || level.kind === 'instruction-order') steps = [board, run,
      action('Find the instruction controls', 'Open this instruction selector to inspect the available operations. Choose the program yourself using the lesson. Changing an operation resets that block’s fields.', at('instruction-type'), 'change'),
    ];
    else if (level.moduleId === 'microcontrollers') steps = [board];
    else if (level.moduleId === 'integration') steps = [];
    else if (level.kind === 'connect') steps = [action('Toggle the switch', 'Click the switch control in this practice circuit. Then test the circuit to see how its state affects the output.', at('switch')), run];
    else steps = [action('Add a part', 'Click an Add button in Component tray. The part appears on the canvas and becomes available in the inspector and terminal menus.', at('add-part')), inspect, run];
    return { title: 'Walk through Try', steps: [...steps, locked ? action('Finish the prerequisite first', 'Build and Prove are locked. Click the outlined prerequisite action, pass that level, then return here. Learn and Try stay open for practice.', at('prerequisite')) : continuePractice] };
  }
  if (phase === 2) {
    const knowledge = !['connect', 'circuit-build', 'logic-build', 'controller-build', 'instruction-order'].includes(level.kind);
    return { title: 'Walk through Build', steps: [...(knowledge ? answered ? [] : [answers] : [run]), action('Finish Build', 'Complete your own answers or circuit, then choose Check and prove. This opens the submission stage; it does not submit yet.', at('build-next'))] };
  }
  if (phase === 3) return { title: 'Walk through Prove', steps: [action('Submit when you are ready', 'Check your work first. Click Submit for review only when you want the server to grade this attempt. Submission makes the attempt read-only.', at('submit'))] };
  return { title: 'Walk through Review', steps: [action('Choose where to go next', 'Read each criterion’s feedback, then return to the module to choose your next level. A failed level can be replayed. Passing unlocks the next challenge.', at('review-next'))] };
}

export const SURFACE_GUIDES: Record<'journey' | 'module' | 'primer' | 'sandbox' | 'progress' | 'instructor' | 'inspection', Guide> = {
  journey: { title: 'Walk through your journey', steps: [action('Open your next learning step', 'Click the outlined action to start the introduction or continue learning. Your progress determines the next destination.', '.ohm-intro a.ohm-button')] },
  module: { title: 'Choose a level', steps: [action('Open a level', 'Click a level action to open its lesson. Read lesson means Build is still locked; the level page names the exact prerequisite you must pass.', '.ohm-level-row a')] },
  primer: { title: 'Try the night lamp', steps: [
    action('Change the light', 'Move the actual Ambient light slider. Follow the sensor reading, controller decision and lamp state as you change it.', at('lamp-light'), 'change'),
    action('Toggle the switch', 'Click the actual switch. Watch the lamp response, then continue through the explanation cards.', at('lamp-switch')),
    action('Continue the introduction', 'Click Next to read the next card. Finish all four cards before Start my journey becomes available.', at('primer-next')),
  ] },
  sandbox: { title: 'Walk through the sandbox', steps: [action('Add one earned part', 'Click an Add button to put a real component on your canvas. Changes here belong to your saved sandbox. End the walkthrough any time to leave your work as it is.', at('add-part')), inspect, run] },
  progress: { title: 'Read your progress', steps: [action('Return to your journey', 'Completion counts passed levels out of 30. Click Journey to choose what to learn next. Replays preserve your best results and do not repeat first-pass XP.', at('journey'))] },
  instructor: { title: 'Walk through analytics', steps: [
    action('Apply your filters', 'Choose the dates and optional search, then apply the filters. Dates affect activity; lifetime completion stays earned.', 'button[type="submit"]'),
  ] },
  inspection: { title: 'Inspect submitted work', steps: [action('Open a saved attempt', 'Click Inspect saved attempt to view immutable submitted work and its feedback. If this learner has no submissions, use Back to authorized roster.', 'a[data-ohm-tour="inspect-attempt"], a[data-ohm-tour="roster"]')] },
};
