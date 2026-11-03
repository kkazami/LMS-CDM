import { LEVELS, PRIMER } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';
import { HINTS, correctFixture, gradeResponse } from '../../apps/web/src/features/interactive-activities/ohmward/server/grading';
import { controllerCases } from '../../apps/web/src/features/interactive-activities/ohmward/server/sprint3-grading';
import { finalCases } from '../../apps/web/src/features/interactive-activities/ohmward/server/sprint4-grading';

const args = process.argv.slice(2), index = args.indexOf('--sprint');
const sprint = index < 0 ? undefined : Number(args[index + 1]);
if (args.some((arg, i) => i !== index + 1 && arg !== '--sprint') || index >= 0 && ![1, 2, 3, 4].includes(sprint!)) throw Error('Use --sprint 1, 2, 3, or 4.');
const levels = sprint === undefined ? LEVELS : sprint === 1 ? LEVELS.filter(level=>level.id.startsWith('CIR')&&level.number<=3) : sprint === 2 ? LEVELS.filter(level=>level.moduleId==='sensors'||level.moduleId==='circuitry'&&level.number>3) : sprint===3 ? LEVELS.filter(level=>level.moduleId==='microcontrollers'||level.moduleId==='integration'&&level.number<=3) : LEVELS.filter(level=>level.moduleId==='integration'&&level.number>=4);
process.stdout.write(JSON.stringify({ schemaVersion: 1, sprint: sprint ?? 'all-delivered', primer: sprint === undefined || sprint === 1 ? PRIMER : null,
  levels: levels.map(level => ({ ...level, hints: HINTS[level.id], grading: { passScore: 80, mandatoryCorrectnessRequired: true, firstPassXp: 50, hintsAffectScore: false },
    fixtures: level.variants.map(variant => ({ variantId: variant.id, ...(level.kind==='controller-build'||level.kind==='instruction-order'?{serverCases:level.moduleId==='integration'&&level.number>=4?finalCases(level,variant.id):controllerCases(level,variant.id)}:{}), correct: correctFixture(level.id, variant.id), expected: gradeResponse(level.id, level.version, variant.id, correctFixture(level.id, variant.id), 0), incorrect: { answers: {}, wires: [], switchClosed: true }, incorrectExpected: gradeResponse(level.id, level.version, variant.id, { answers: {}, wires: [], switchClosed: true }, 0) })) })) }, null, 2) + '\n');
