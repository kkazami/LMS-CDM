import { COMPONENTS, getLevel } from '../curriculum/catalog';
import { evaluateSeriesLoop } from '../domain/circuit';
import type { Criterion, Grade, ResponseState } from '../domain/types';
import { OhmwardError, stateSchema } from '../domain/schema';
import { sprint2Criteria, sprint2Fixture, SPRINT2_HINTS } from './sprint2-grading';
import { sprint3Criteria, sprint3Fixture, SPRINT3_HINTS } from './sprint3-grading';
import { sprint4Criteria, sprint4Fixture, SPRINT4_HINTS } from './sprint4-grading';

// This module is server/CLI-only. Client previews import circuit.ts, never answer keys.
export const HINTS: Record<string, string[]> = {
  ...SPRINT2_HINTS,
  ...SPRINT3_HINTS,
  ...SPRINT4_HINTS,
  'CIR-01': ['Look at the distinguishing marks, not the symbol’s orientation.', 'A diode with arrows pointing outward is a light-emitting component.', 'Battery: unequal lines; resistor: zigzag; capacitor: equal plates; ground: shrinking horizontal lines.'],
  'CIR-02': ['Think of supply, control, output, protection, storage, and reference as different roles.', 'The resistor limits current; an LED emits light. Ground is a reference, not an energy source.', 'Battery supplies potential difference; switch opens/closes; capacitor stores electric-field energy.'],
  'CIR-03': ['Begin at battery positive. Every terminal needs one wire.', 'Keep the resistor and switch in the same path as the LED. Do not wire directly between the battery terminals.', 'One valid order is positive → switch → resistor → LED anode → LED cathode → negative.'],
};
export function expectedAnswers(levelId: string, variantId: string): Record<string, string> {
  if (levelId === 'CIR-01') return { q17: 'battery', q42: 'resistor', q08: 'led', q63: 'switch', q29: 'ground', q51: 'capacitor' };
  if (levelId === 'CIR-02') return Object.fromEntries((variantId === 'b' ? [...COMPONENTS].reverse() : COMPONENTS).map((part, i) => [`role-${i}`, part.id]));
  return {};
}
export function gradeResponse(levelId: string, version: number, variantId: string, input: unknown, hintCount: number): Grade {
  const level = getLevel(levelId, version), state = stateSchema.parse(input);
  const variant = level?.variants.find(item => item.id === variantId);
  if (!level || !variant) throw new OhmwardError(409, 'This attempt’s content version is unavailable. Contact your instructor.');
  let criteria: Criterion[];
  if(level.moduleId==='integration'&&level.number>=4){
    criteria=sprint4Criteria(level,variantId,state);
  } else if(level.moduleId==='microcontrollers'||level.moduleId==='integration') {
    criteria=sprint3Criteria(level,variantId,state);
  } else if (!['CIR-01','CIR-02','CIR-03'].includes(levelId)) {
    criteria=sprint2Criteria(level,variantId,state);
  } else if (level.kind === 'connect') {
    const closed = evaluateSeriesLoop(variant, state.wires, true), open = evaluateSeriesLoop(variant, state.wires, false);
    criteria = [
      { id: 'closed-loop', concept: 'series-loop', passed: closed.valid && closed.closed, points: closed.valid && closed.closed ? 60 : 0, possible: 60, mandatory: true, feedback: closed.message },
      { id: 'switch-opens', concept: 'switch-control', passed: open.valid && !open.closed, points: open.valid && !open.closed ? 20 : 0, possible: 20, mandatory: true, feedback: open.message },
      { id: 'protected-layout', concept: 'led-protection', passed: closed.valid, points: closed.valid ? 20 : 0, possible: 20, mandatory: true, feedback: closed.valid ? 'The resistor and correctly polarized LED are in the only power path.' : 'A safe, complete series arrangement is required.' },
    ];
  } else {
    const answers = expectedAnswers(levelId, variantId);
    criteria = variant.questions.map(question => {
      const passed = state.answers[question.id] === answers[question.id];
      return { id: question.id, concept: `${level.kind}-${answers[question.id]}`, passed, points: passed ? 1 : 0, possible: 1, mandatory: false,
        feedback: passed ? 'Correct: the symbol or function matches this component.' : `Review ${COMPONENTS.find(part => part.id === answers[question.id])?.name}: ${COMPONENTS.find(part => part.id === answers[question.id])?.function}` };
    });
  }
  const score = Math.round(criteria.reduce((sum, item) => sum + item.points, 0) / criteria.reduce((sum, item) => sum + item.possible, 0) * 10000) / 100;
  const passed = score >= 80 && criteria.every(item => !item.mandatory || item.passed);
  return { score, passed, stars: !passed ? 0 : score < 90 ? 1 : hintCount > 0 ? 2 : 3, criteria, misconceptions: criteria.filter(item => !item.passed).map(item => item.concept) };
}

export function correctFixture(levelId: string, variantId: string): ResponseState {
  const level=getLevel(levelId);
  if(level?.moduleId==='integration'&&level.number>=4)return sprint4Fixture(level,variantId);
  if(level&&(level.moduleId==='microcontrollers'||level.moduleId==='integration'))return sprint3Fixture(level,variantId);
  if(level && !['CIR-01','CIR-02','CIR-03'].includes(levelId))return sprint2Fixture(level,variantId);
  return { answers: expectedAnswers(levelId, variantId), switchClosed: true, wires: levelId === 'CIR-03' ? [
    { id: 'w1', from: { componentId: 'supply', terminalId: 'positive' }, to: { componentId: 'control', terminalId: 'left' } },
    { id: 'w2', from: { componentId: 'control', terminalId: 'right' }, to: { componentId: 'limit', terminalId: 'left' } },
    { id: 'w3', from: { componentId: 'limit', terminalId: 'right' }, to: { componentId: 'light', terminalId: 'anode' } },
    { id: 'w4', from: { componentId: 'light', terminalId: 'cathode' }, to: { componentId: 'supply', terminalId: 'negative' } },
  ] : [] };
}
