import assert from 'node:assert/strict';
import { test } from 'node:test';
import { LEVELS, PRIMER, challengeUnlocked } from '../../apps/web/src/features/interactive-activities/ohmward/curriculum/catalog';
import { correctFixture, gradeResponse, HINTS } from '../../apps/web/src/features/interactive-activities/ohmward/server/grading';
import { evaluateSeriesLoop } from '../../apps/web/src/features/interactive-activities/ohmward/domain/circuit';
import { EMPTY_STATE } from '../../apps/web/src/features/interactive-activities/ohmward/domain/types';
import { readBody, saveSchema } from '../../apps/web/src/features/interactive-activities/ohmward/domain/schema';

for (const level of LEVELS) for (const variant of level.variants) {
  test(`${level.id}/${variant.id}: correct work passes; empty work fails; hints change stars only`, () => {
    const result = gradeResponse(level.id, 1, variant.id, correctFixture(level.id, variant.id), 0);
    assert.equal(result.score, 100); assert.equal(result.passed, true); assert.equal(result.stars, 3);
    const hinted = gradeResponse(level.id, 1, variant.id, correctFixture(level.id, variant.id), 1);
    assert.equal(hinted.score, 100); assert.equal(hinted.stars, 2);
    assert.equal(gradeResponse(level.id, 1, variant.id, EMPTY_STATE, 0).passed, false);
  });
}
test('five of six knowledge criteria pass at 83.33; four fail; false claims are rejected', () => {
  const response = correctFixture('CIR-01', 'a'); response.answers.q17 = 'resistor';
  assert.equal(gradeResponse('CIR-01', 1, 'a', response, 0).score, 83.33);
  assert.equal(gradeResponse('CIR-01', 1, 'a', response, 0).stars, 1);
  response.answers.q29 = 'battery'; assert.equal(gradeResponse('CIR-01', 1, 'a', response, 0).passed, false);
  assert.throws(() => saveSchema.parse({ revision: 0, state: response, score: 100 }));
  assert.throws(() => gradeResponse('CIR-01', 99, 'a', response, 0));
});
test('CIR-03 rejects reversed LED, battery short, duplicate terminals, disconnected and unknown pins', () => {
  const variant = LEVELS[2].variants[0], fixture = correctFixture('CIR-03', 'a');
  const reversed = structuredClone(fixture); reversed.wires[2].to.terminalId = 'cathode'; reversed.wires[3].from.terminalId = 'anode';
  assert.equal(evaluateSeriesLoop(variant, reversed.wires, true).misconception, 'reversed-led');
  const short = structuredClone(fixture); short.wires[0].to = { componentId: 'supply', terminalId: 'negative' };
  assert.equal(evaluateSeriesLoop(variant, short.wires, true).valid, false);
  const duplicate = structuredClone(fixture); duplicate.wires[1].from = duplicate.wires[0].from;
  assert.equal(evaluateSeriesLoop(variant, duplicate.wires, true).valid, false);
  assert.equal(evaluateSeriesLoop(variant, fixture.wires.slice(1), true).valid, false);
  const unknown = structuredClone(fixture); unknown.wires[0].from.componentId = 'untrusted-part';
  assert.equal(evaluateSeriesLoop(variant, unknown.wires, true).valid, false);
});
test('CIR-03 accepts equivalent series order and reversed wire direction; open switch gives zero current', () => {
  const variant = LEVELS[2].variants[0], fixture = correctFixture('CIR-03', 'a');
  const changed = structuredClone(fixture);
  for (const wire of changed.wires) { for (const end of [wire.from, wire.to]) { if (end.componentId === 'control') end.componentId = 'limit'; else if (end.componentId === 'limit') end.componentId = 'control'; } [wire.from, wire.to] = [wire.to, wire.from]; }
  assert.equal(evaluateSeriesLoop(variant, changed.wires, true).valid, true);
  assert.ok(Math.abs(evaluateSeriesLoop(variant, changed.wires, true).currentMilliamps - 1000/220) < .00001);
  const off = evaluateSeriesLoop(variant, changed.wires, false); assert.equal(off.valid, true); assert.equal(off.closed, false); assert.equal(off.currentMilliamps, 0);
});
test('progression requires primer and previous pass, never stars or unavailable levels', () => {
  assert.equal(challengeUnlocked('CIR-01', false, []), false);
  assert.equal(challengeUnlocked('CIR-01', true, []), true);
  assert.equal(challengeUnlocked('CIR-02', true, []), false);
  assert.equal(challengeUnlocked('CIR-02', true, ['CIR-01']), true);
  assert.equal(challengeUnlocked('CIR-04', true, ['CIR-03']), true);
  assert.equal(challengeUnlocked('SEN-02', true, ['CIR-01']), false);
  assert.equal(challengeUnlocked('SEN-02', true, ['SEN-01']), true);
});
test('delivered content has complete cards, two variants, three hints, references and numeric assumptions', () => {
  assert.equal(LEVELS.length, 30); assert.equal(PRIMER.cards.length, 4);
  for (const level of LEVELS) { assert.ok(level.lessons.length >= 3); assert.equal(level.variants.length, 2); assert.equal(HINTS[level.id].length, 3); assert.ok(level.references.every(source => source.url.startsWith('https://'))); assert.ok(level.simplifications.length); }
  const values = LEVELS[2].variants[1].values; assert.equal(values.supplyVolts, 5); assert.equal(values.resistanceOhms, 330); assert.equal(values.ledForwardVolts, 2);
});
test('streamed payload limits reject oversized input without relying on Content-Length', async () => {
  const bytes = new TextEncoder().encode('x'.repeat(128*1024+1));
  await assert.rejects(readBody(new Request('https://example.invalid', { method: 'POST', body: bytes })), error => (error as {status:number}).status === 413);
  await assert.rejects(readBody(new Request('https://example.invalid', { method: 'POST', body: '{' })), error => (error as {status:number}).status === 400);
});
test('independent knowledge goldens and neutral public geometry establish the answer boundary', () => {
  const answers = { q17: 'battery', q42: 'resistor', q08: 'led', q63: 'switch', q29: 'ground', q51: 'capacitor' };
  for (const variant of ['a','b']) {
    assert.equal(gradeResponse('CIR-01',1,variant,{ answers, wires:[], switchClosed:true },0).score,100);
    const questions=LEVELS[0].variants.find(item=>item.id===variant)!.questions;
    for(const question of questions){assert.ok(question.drawing?.description);assert.equal('symbol' in question,false);assert.ok(!Object.values(answers).some(answer=>question.id.includes(answer)));}
  }
  const functionsA={ 'role-0':'battery','role-1':'resistor','role-2':'led','role-3':'switch','role-4':'ground','role-5':'capacitor' };
  assert.equal(gradeResponse('CIR-02',1,'a',{answers:functionsA,wires:[],switchClosed:true},0).score,100);
});
