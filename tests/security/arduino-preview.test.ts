import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSketch, sketchOutputSnapshots, SketchSyntaxError } from '../../apps/web/src/features/interactive-activities/arduino/utils/sketch-program';
import { ArduinoSimulation } from '../../apps/web/src/features/interactive-activities/arduino/utils/interpreter';
import { useArduinoStore } from '../../apps/web/src/features/interactive-activities/arduino/stores/arduino-store';

const blink = 'const int ledPin=13; void setup(){pinMode(ledPin,OUTPUT);} void loop(){digitalWrite(ledPin,HIGH);delay(1000);digitalWrite(ledPin,LOW);delay(1000);}';

test('the introductory blink sketch parses to data shared by preview and server grading', () => {
  const program = parseSketch(blink);
  assert.deepEqual(program.setup, [{ op: 'mode', pin: 13, mode: 'OUTPUT' }]);
  assert.deepEqual(program.loop, [
    { op: 'write', pin: 13, value: 1 }, { op: 'wait', ms: 1000 },
    { op: 'write', pin: 13, value: 0 }, { op: 'wait', ms: 1000 },
  ]);
  assert.deepEqual(sketchOutputSnapshots(program), [{ 'uno-13': 1 }, { 'uno-13': 0 }]);
});

test('unsupported source cannot name a network API, global object, function constructor or arbitrary loop', () => {
  for (const statement of [
    'fetch("https://example.invalid");', 'globalThis.fetch("https://example.invalid");',
    'window.location="https://example.invalid";', 'process.env.SECRET;',
    'Function("return globalThis")();', '(async function(){}).constructor("return globalThis")();',
    'while(true){}', 'for(;;){}', 'digitalWrite(13,1+0);',
  ]) assert.throws(() => parseSketch('void setup(){pinMode(13,OUTPUT);} void loop(){' + statement + '}'), SketchSyntaxError);
});

test('the sketch subset rejects ambiguous literals, comments, whitespace and missing semicolons', () => {
  for (const source of [
    blink.replace('ledPin=13', 'ledPin=013'),
    blink.replace('digitalWrite(ledPin,HIGH)', 'digitalWrite(013,HIGH)'),
    blink.replace('delay(1000)', 'delay(010)'),
    blink.replace('pinMode', 'pin/**/Mode'),
    blink.replace('void setup', 'void\u00a0setup'),
    'void setup(){pinMode(13,OUTPUT);} void loop(){ // continued comment \\\n digitalWrite(13,HIGH); }',
    'void setup(){pinMode(13,OUTPUT)} void loop(){digitalWrite(13,HIGH);}',
    'void setup(){pinMode(13,OUTPUT);} void loop(){digitalWrite(13,HIGH)}',
    'int return=13; void setup(){pinMode(return,OUTPUT);} void loop(){digitalWrite(return,HIGH);}',
  ]) assert.throws(() => parseSketch(source), SketchSyntaxError);
});

test('constant, statement, pin, delay and source bounds fail closed', () => {
  for (const source of [
    ' '.repeat(8001),
    Array.from({ length: 33 }, (_, i) => 'int p' + i + '=0;').join('') + 'void setup(){} void loop(){}',
    'void setup(){pinMode(13,OUTPUT);} void loop(){' + 'digitalWrite(13,HIGH);'.repeat(128) + '}',
    'void setup(){pinMode(14,OUTPUT);} void loop(){}',
    'void setup(){pinMode(13,OUTPUT);} void loop(){delay(10001);}',
    'void setup(){} void loop(){digitalWrite(13,HIGH);}',
  ]) assert.throws(() => parseSketch(source), SketchSyntaxError);
});

test('stop then restart cancels the old delayed generation without stopping or writing into the new preview', { timeout: 2000 }, async t => {
  const original = useArduinoStore.getState(), simulation = new ArduinoSimulation();
  const writes: Array<{ pin: string; value: unknown }> = [], events: string[] = [];
  let firstOld!: () => void, firstNew!: () => void;
  const oldWrite = new Promise<void>(resolve => { firstOld = resolve; });
  const newWrite = new Promise<void>(resolve => { firstNew = resolve; });
  useArduinoStore.setState({
    startSimulation: () => { events.push('start'); }, stopSimulation: () => { events.push('stop'); },
    logSerial: message => { events.push(message); },
    setPinVoltage: (pin, value) => {
      writes.push({ pin, value });
      if (pin === 'uno-13') firstOld();
      if (pin === 'uno-12') firstNew();
    },
  });
  t.after(() => { simulation.stop(); useArduinoStore.setState(original, true); });
  const oldRun = simulation.run(blink);
  await oldWrite;
  simulation.stop();
  const boundary = writes.length;
  const newRun = simulation.run(blink.replace('ledPin=13', 'ledPin=12'));
  await newWrite;
  await oldRun;
  assert.ok(writes.slice(boundary).length > 0);
  assert.ok(writes.slice(boundary).every(write => write.pin === 'uno-12'));
  assert.equal(events.filter(event => event === 'stop').length, 1, 'Old finally must not stop the new generation');
  simulation.stop();
  await newRun;
  assert.equal(events.filter(event => event.startsWith('[')).length, 0);
});

test('rejected preview source never starts the simulator or writes a pin', async t => {
  const original = useArduinoStore.getState(), simulation = new ArduinoSimulation();
  let started = 0, written = 0;
  const errors: string[] = [];
  useArduinoStore.setState({ startSimulation: () => { started++; }, setPinVoltage: () => { written++; }, logSerial: message => { errors.push(message); } });
  t.after(() => useArduinoStore.setState(original, true));
  await simulation.run('void setup(){} void loop(){globalThis.fetch("https://example.invalid");}');
  assert.equal(started, 0);
  assert.equal(written, 0);
  assert.match(errors[0], /^\[Compiler Error\]/);
});
