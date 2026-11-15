import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gradeActivity, ActivityGradingError } from '../../apps/web/src/features/interactive-activities/shared/grade-activity';
import { activitySubmissionInputSchema } from '../../apps/web/src/features/interactive-activities/shared/schemas';

const template = { variables: '{}', faultPool: '[]', difficulty: 1 };
const placed = (socketId: string) => ({ placed: true, socketId });
const pc = {
  mobo: placed('case-mobo-socket'), cpu: placed('mobo-cpu-socket'), cooler: placed('mobo-cooler-socket'),
  gpu: placed('mobo-gpu-socket'), psu: placed('case-psu-socket'), thermalPasteApplied: true,
  ramSticks: { ram1: placed('dimm-A2'), ram2: placed('dimm-B2') },
};
const grade = (type: string, answers: unknown, config = template) => gradeActivity(type, answers, config, 'test-seed');

test('non-CodeLab input accepts answers and rejects student outcome claims; CodeLab stays compatible', () => {
  const base = { studentId: 'student', assignmentId: 'assignment', activityType: 'pc-build', variantSeed: 'seed', startedAt: '2026-11-14T00:00:00.000Z', completionTimeSeconds: 1, attempts: 1 };
  assert.equal(activitySubmissionInputSchema.safeParse({ ...base, answers: pc }).success, true);
  for (const claim of [{ score: 100 }, { passed: true }, { maxScore: 100 }, { stateCheck: { postTestPassed: true } }]) {
    assert.equal(activitySubmissionInputSchema.safeParse({ ...base, answers: pc, ...claim }).success, false);
  }
  assert.equal(activitySubmissionInputSchema.safeParse({ ...base, activityType: 'codelab', stateCheck: { sourceCode: 'print(1)' }, score: 100, maxScore: 100, passed: true }).success, true);
});

test('PC assessment computes pass from actual placements; missing paste and invalid RAM do not earn credit', () => {
  assert.equal(grade('pc-build', pc).score, 100);
  assert.equal(grade('pc-build', { ...pc, thermalPasteApplied: false }).score, 0);
  assert.equal(grade('pc-build', { ...pc, cpu: placed('wrong-socket') }).passed, false);
  assert.equal(grade('pc-build', { ...pc, ramSticks: { ram1: placed('dimm-A2'), ram2: placed('dimm-A2') } }).passed, false);
  assert.throws(() => grade('pc-build', { ...pc, postTestPassed: true }), ActivityGradingError);
});

test('rack grading recomputes reachability and rejects self-ping, absent cabling and mismatched subnet', () => {
  const rack = {
    equipment: Object.fromEntries(['patch1', 'switch1', 'server1', 'server2'].map((id, index) => [id, { id, type: id === 'patch1' ? 'PATCH_PANEL' : id === 'switch1' ? 'SWITCH' : 'SERVER', ruSlot: index + 1, ports: [] }])),
    deviceConfigs: { server1: { ip: '192.168.1.10', mask: '255.255.255.0' }, server2: { ip: '192.168.1.11', mask: '255.255.255.0' } },
    cables: [{ id: 'a', fromPort: 'server1-eth0', toPort: 'switch1-p1', isT568B: true }, { id: 'b', fromPort: 'switch1-p2', toPort: 'server2-eth0', isT568B: true }],
    sourceId: 'server1', destinationIp: '192.168.1.11',
  };
  assert.equal(grade('server-rack', rack).score, 100);
  assert.equal(grade('server-rack', { ...rack, cables: [] }).score, 0);
  assert.equal(grade('server-rack', { ...rack, destinationIp: '192.168.1.10' }).score, 0);
  assert.equal(grade('server-rack', { ...rack, deviceConfigs: { ...rack.deviceConfigs, server1: { ip: '192.168.1.11', mask: '255.255.255.0' } } }).score, 0);
  assert.equal(grade('server-rack', { ...rack,
    deviceConfigs: { ...rack.deviceConfigs, server1: { ip: '192.168.1.11', mask: '255.255.255.0' } },
    cables: [{ id: 'a', fromPort: 'patch1-p1', toPort: 'switch1-p1', isT568B: true }, { id: 'b', fromPort: 'patch1-p2', toPort: 'switch1-p2', isT568B: true }],
  }).score, 0, 'Duplicate-IP self-ping must never award credit to disconnected servers');
  assert.equal(grade('server-rack', { ...rack, equipment: { ...rack.equipment, server1: { ...rack.equipment.server1, type: 'SWITCH' } } }).score, 0);
  assert.throws(() => grade('server-rack', { ...rack, deviceConfigs: { ...rack.deviceConfigs, patch1: rack.deviceConfigs.server2 } }), ActivityGradingError);
  assert.throws(() => grade('server-rack', { ...rack, deviceConfigs: { ...rack.deviceConfigs, server2: { ip: '192.168.1.011', mask: '255.255.255.0' } } }), ActivityGradingError);
  assert.throws(() => grade('server-rack', { ...rack, deviceConfigs: { ...rack.deviceConfigs, server2: { ip: '192.168.1.11', mask: '255.0.255.0' } } }), ActivityGradingError);
  assert.throws(() => grade('server-rack', { ...rack, cables: [...rack.cables, rack.cables[0]] }), ActivityGradingError);
  assert.equal(grade('server-rack', { ...rack, deviceConfigs: { ...rack.deviceConfigs, server1: { ip: '192.168.2.10', mask: '255.255.255.0' } } }).score, 0);
  assert.throws(() => grade('server-rack', { ...rack, pingSuccess: true }), ActivityGradingError);
});

test('logic grading recomputes all input permutations and ignores forged live gate/wire states', () => {
  const logic = {
    gates: {
      inA: { id: 'inA', type: 'INPUT', position: [0, 0, 0], state: false },
      'g-123': { id: 'g-123', type: 'NOT', position: [0, 0, 0], state: true },
      outY: { id: 'outY', type: 'OUTPUT', position: [0, 0, 0], state: true },
    },
    wires: [{ id: 'w-1', fromPin: 'inA-out', toPin: 'g-123-in0', state: true }, { id: 'w-2', fromPin: 'g-123-out', toPin: 'outY-in0', state: false }],
  };
  const config = { ...template, variables: JSON.stringify({ targetTruthTable: { inputs: ['inA'], outputs: ['outY'], rows: [{ in: [false], out: [true] }, { in: [true], out: [false] }] } }) };
  assert.equal(grade('logic-gate', logic, config).score, 100);
  assert.equal(grade('logic-gate', { ...logic, wires: logic.wires.map(w => ({ ...w, state: !w.state })) }, config).score, 100);
  assert.equal(grade('logic-gate', { gates: { inA: logic.gates.inA, outY: logic.gates.outY }, wires: [{ id: 'direct', fromPin: 'inA-out', toPin: 'outY-in0', state: true }] }, config).score, 0);
  assert.throws(() => grade('logic-gate', logic), ActivityGradingError);
  assert.throws(() => grade('logic-gate', { ...logic, wires: [{ id: 'cycle', fromPin: 'g-123-out', toPin: 'g-123-in0', state: true }] }, config), ActivityGradingError);
  assert.throws(() => grade('logic-gate', { ...logic, gates: { ...logic.gates, 'g-123': { ...logic.gates['g-123'], type: 'D_FF' } } }, config), ActivityGradingError);
});

test('mixed-case logic IDs map truth-table inputs and outputs by the solver order', () => {
  const gate = (id: string, type: string) => ({ id, type, position: [0, 0, 0], state: false });
  const gates = { a: gate('a', 'INPUT'), B: gate('B', 'INPUT'), outY: gate('outY', 'OUTPUT') };
  const rows = [{ in: [false, false], out: [false] }, { in: [false, true], out: [false] }, { in: [true, false], out: [true] }, { in: [true, true], out: [true] }];
  const config = { ...template, variables: JSON.stringify({ targetTruthTable: { inputs: ['a', 'B'], outputs: ['outY'], rows } }) };
  const wire = (from: string, to: string) => ({ id: `wire-${from}-${to}`, fromPin: `${from}-out`, toPin: `${to}-in0`, state: false });
  assert.equal(grade('logic-gate', { gates, wires: [wire('a', 'outY')] }, config).score, 100);
  const wrong = grade('logic-gate', { gates, wires: [wire('B', 'outY')] }, config);
  assert.equal(wrong.score, 50);
  assert.equal(wrong.passed, false);

  const outputGates = { x: gate('x', 'INPUT'), a: gate('a', 'OUTPUT'), B: gate('B', 'OUTPUT'), invert: gate('invert', 'NOT') };
  const outputConfig = { ...template, variables: JSON.stringify({ targetTruthTable: { inputs: ['x'], outputs: ['B', 'a'], rows: [{ in: [false], out: [true, false] }, { in: [true], out: [false, true] }] } }) };
  assert.equal(grade('logic-gate', { gates: outputGates, wires: [wire('x', 'a'), wire('x', 'invert'), wire('invert', 'B')] }, outputConfig).score, 100);
});

test('Arduino grading interprets only bounded supported calls and recomputes the circuit from answers', () => {
  const sketch = 'const int ledPin = 13; void setup() { pinMode(ledPin, OUTPUT); } void loop() { digitalWrite(ledPin, HIGH); delay(1000); digitalWrite(ledPin, LOW); delay(1000); }';
  const wires = [{ id: 'wire-1', fromPin: 'uno-13', toPin: 'bb-A10', color: 'red' }, { id: 'wire-2', fromPin: 'bb-GND-left---11', toPin: 'uno-GND1', color: 'black' }];
  assert.equal(grade('arduino', { code: sketch, wires }).score, 100);
  assert.equal(grade('arduino', { code: sketch, wires: [] }).score, 0);
  assert.equal(grade('arduino', { code: sketch.replace('HIGH', 'LOW'), wires }).score, 0);
  for (const code of [sketch + 'process.exit()', 'void setup() {} void loop() { while (true) {} }', 'void setup() {} void loop() { digitalWrite(13, HIGH); }', 'void setup() {} void loop() { fetch("https://example.invalid"); }']) {
    assert.throws(() => grade('arduino', { code, wires }), ActivityGradingError);
  }
  assert.throws(() => grade('arduino', { code: sketch, wires, ledSuccessfullyLit: true }), ActivityGradingError);
});

test('Arduino rejects octal-looking literals and token/comment ambiguities rather than grading different C++ semantics', () => {
  const wires = [{ id: 'w1', fromPin: 'uno-13', toPin: 'bb-A10', color: 'red' }, { id: 'w2', fromPin: 'bb-GND-left---11', toPin: 'uno-GND1', color: 'black' }];
  for (const code of [
    'int ledPin=013; void setup(){pinMode(ledPin,OUTPUT);} void loop(){digitalWrite(ledPin,HIGH);}',
    'void setup(){pinMode(013,OUTPUT);} void loop(){digitalWrite(13,HIGH);}',
    'void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(013,HIGH);}',
    'void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);delay(010);}',
    'int ledPin=1/**/3; void setup(){pinMode(ledPin,OUTPUT);} void loop(){digitalWrite(ledPin,HIGH);}',
    'void setup(){pin/**/Mode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);}',
    'byte unused=256; void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH);}',
    'int ledPin=13; int ledPin=13; void setup(){pinMode(ledPin,OUTPUT);} void loop(){digitalWrite(ledPin,HIGH);}',
  ]) assert.throws(() => grade('arduino', { code, wires }), ActivityGradingError);
});
