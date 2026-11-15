import { z } from 'zod';
import { evaluatePing } from '../server-rack/utils/network-solver';
import { compareTruthTables, generateTruthTable } from '../logic-gate/utils/logic-solver';
import { resolveCircuit } from '../arduino/utils/circuit-solver';
import { injectFaults } from '../arduino/utils/fault-engine';
import { parseSketch, sketchOutputSnapshots, SketchSyntaxError } from '../arduino/utils/sketch-program';
import type { CircuitComponent } from '../arduino/stores/arduino-store';
import type { LogicGate, LogicWire } from '../logic-gate/stores/logic-store';

export class ActivityGradingError extends Error {}
const id = z.string().min(1).max(80).regex(/^[A-Za-z0-9_-]+$/);
const part = z.object({ placed: z.boolean(), socketId: z.string().max(80).nullable() }).strict();
const pcAnswers = z.object({
  mobo: part, cpu: part, cooler: part, gpu: part, psu: part,
  thermalPasteApplied: z.boolean(), ramSticks: z.record(z.string().max(40), part).refine(value => Object.keys(value).length <= 4),
}).strict();
const ip = z.string().max(15).refine(value => value.split('.').length === 4 && value.split('.').every(octet => /^(?:0|[1-9]\d{0,2})$/.test(octet) && Number(octet) <= 255));
const mask = ip.refine(value => /^1*0*$/.test(value.split('.').map(octet => Number(octet).toString(2).padStart(8, '0')).join('')));
const rackAnswers = z.object({
  equipment: z.record(id, z.object({ id, type: z.enum(['SWITCH', 'SERVER', 'PATCH_PANEL']), ruSlot: z.number().int().min(1).max(42).nullable(), ports: z.array(z.string().max(80)).max(24) }).strict()).refine(value => Object.keys(value).length <= 4),
  cables: z.array(z.object({ id: z.string().max(80), fromPort: z.string().max(80), toPort: z.string().max(80), isT568B: z.boolean() }).strict()).max(48),
  deviceConfigs: z.record(id, z.object({ ip, mask }).strict()).refine(value => Object.keys(value).length <= 4),
  sourceId: id, destinationIp: ip,
}).strict();
const gateTypes = z.enum(['AND', 'OR', 'NOT', 'XOR', 'NAND', 'NOR', 'INPUT', 'OUTPUT']);
const logicAnswers = z.object({
  gates: z.record(id, z.object({ id, type: gateTypes, position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]), state: z.boolean() }).strict()).refine(value => Object.keys(value).length <= 32),
  wires: z.array(z.object({ id, fromPin: z.string().max(100), toPin: z.string().max(100), state: z.boolean() }).strict()).max(64),
}).strict();
const targetTable = z.object({ inputs: z.array(id).min(1).max(6), outputs: z.array(id).min(1).max(8), rows: z.array(z.object({ in: z.array(z.boolean()).max(6), out: z.array(z.boolean()).max(8) }).strict()).min(1).max(64) }).strict();
const pin = z.string().regex(/^(?:uno-(?:[0-9]|1[0-3]|GND[123]|5V|3V3)|bb-(?:[A-J](?:[1-9]|[12][0-9]|30)|(?:GND|PWR)-[12]|GND-(?:left|right)---(?:[1-9]|[12][0-9]|30)|PWR-(?:left|right)-\+-(?:[1-9]|[12][0-9]|30)))$/);
const arduinoAnswers = z.object({ code: z.string().min(1).max(8000), wires: z.array(z.object({ id: z.string().max(80), fromPin: pin, toPin: pin, color: z.string().max(30) }).strict()).max(64) }).strict();


export function gradeActivity(type: string, input: unknown, template: { variables: string; faultPool: string; difficulty: number }, seed: string) {
  let score = 0;
  const stateCheck: Record<string, boolean | number | string> = {};
  try {
    if (type === 'pc-build') {
      const a = pcAnswers.parse(input);
      const seated = (p: z.infer<typeof part>, socket: string) => p.placed && p.socketId === socket;
      const sockets = Object.values(a.ramSticks).filter(ram => ram.placed).map(ram => ram.socketId);
      const assembled = seated(a.mobo, 'case-mobo-socket') && seated(a.cpu, 'mobo-cpu-socket') && seated(a.cooler, 'mobo-cooler-socket') && seated(a.gpu, 'mobo-gpu-socket') && seated(a.psu, 'case-psu-socket') && a.thermalPasteApplied && sockets.length === 2 && sockets.includes('dimm-A2') && sockets.includes('dimm-B2');
      stateCheck.postTestPassed = assembled; score = assembled ? 100 : 0;
    } else if (type === 'server-rack') {
      const a = rackAnswers.parse(input);
      const expected = ['patch1', 'switch1', 'server1', 'server2'];
      const mounted = Object.keys(a.equipment).length === 4 && expected.every(key => a.equipment[key]?.id === key && a.equipment[key].type === (key === 'patch1' ? 'PATCH_PANEL' : key === 'switch1' ? 'SWITCH' : 'SERVER') && a.equipment[key].ruSlot !== null) && new Set(Object.values(a.equipment).map(device => device.ruSlot)).size === 4;
      const validPort = (port: string) => /^(?:(?:patch1|switch1)-p(?:[1-9]|1[0-9]|2[0-4])|server[12]-eth0)$/.test(port);
      if (a.cables.some(cable => !validPort(cable.fromPort) || !validPort(cable.toPort)) || !['server1', 'server2'].includes(a.sourceId)) throw new ActivityGradingError('Use the assignment rack devices and ports.');
      const ports = a.cables.flatMap(cable => [cable.fromPort, cable.toPort]);
      if (new Set(ports).size !== ports.length) throw new ActivityGradingError('Each rack port accepts only one cable.');
      if (Object.keys(a.deviceConfigs).some(key => !['server1', 'server2'].includes(key))) throw new ActivityGradingError('Only the assignment servers have configurable IP interfaces.');
      const addresses = Object.values(a.deviceConfigs).map(config => config.ip);
      const destination = a.deviceConfigs.server2?.ip;
      const success = mounted && Boolean(destination) && new Set(addresses).size === addresses.length && a.sourceId === 'server1' && a.destinationIp === destination && a.cables.length >= 2 && a.cables.every(cable => cable.isT568B) && evaluatePing('server1', destination!, a).success;
      stateCheck.equipmentMounted = mounted; stateCheck.pingSuccess = success; score = success ? 100 : 0;
    } else if (type === 'logic-gate') {
      const a = logicAnswers.parse(input);
      const target = targetTable.parse(JSON.parse(template.variables).targetTruthTable);
      const gates = a.gates as Record<string, LogicGate>, wires = a.wires as LogicWire[];
      const inputs = Object.values(gates).filter(g => g.type === 'INPUT').map(g => g.id).sort();
      const outputs = Object.values(gates).filter(g => g.type === 'OUTPUT').map(g => g.id).sort();
      if (inputs.length > 6 || inputs.join(',') !== [...target.inputs].sort().join(',') || outputs.join(',') !== [...target.outputs].sort().join(',') || target.rows.length !== 2 ** inputs.length || target.rows.some(row => row.in.length !== inputs.length || row.out.length !== outputs.length)) throw new ActivityGradingError('The circuit must match the configured assessment inputs and outputs.');
      for (const [key, gate] of Object.entries(gates)) if (key !== gate.id) throw new ActivityGradingError('Gate identities must match their keys.');
      const destinations = new Set<string>();
      for (const wire of wires) {
        const source = /^([A-Za-z0-9_-]+)-out$/.exec(wire.fromPin), destination = /^([A-Za-z0-9_-]+)-in([01])$/.exec(wire.toPin);
        if (!source || !destination || !gates[source[1]] || !gates[destination[1]] || gates[source[1]].type === 'OUTPUT' || gates[destination[1]].type === 'INPUT' || destinations.has(wire.toPin)) throw new ActivityGradingError('Invalid or duplicate gate connection.');
        destinations.add(wire.toPin);
      }
      if (new Set(wires.map(wire => wire.id)).size !== wires.length) throw new ActivityGradingError('Wire identities must be unique.');
      for (const gate of Object.values(gates)) {
        const pins = wires.filter(wire => wire.toPin.replace(/-in[01]$/, '') === gate.id).map(wire => wire.toPin.slice(-1)).sort().join('');
        const expectedPins = gate.type === 'INPUT' ? '' : ['OUTPUT', 'NOT'].includes(gate.type) ? '0' : '01';
        if (pins !== expectedPins) throw new ActivityGradingError('Connect every gate input to its supported pin.');
      }
      const pending = new Set(Object.keys(gates)), ready = new Set<string>();
      while (pending.size) {
        const next = [...pending].filter(key => wires.filter(wire => wire.toPin.replace(/-in[01]$/, '') === key).every(wire => ready.has(wire.fromPin.replace(/-out$/, ''))));
        if (!next.length) throw new ActivityGradingError('Combinational assessment circuits cannot contain cycles.');
        for (const key of next) { pending.delete(key); ready.add(key); }
      }
      // Only bounded acyclic graphs reach the solver; submitted wire values never determine outputs.
      const generated = generateTruthTable(gates, wires);
      const normalized = { inputs: generated.inputs, outputs: generated.outputs, rows: generated.rows.map(row => {
        const expectedInputs = target.inputs.map(key => row.in[generated.inputs.indexOf(key)]);
        const matching = target.rows.filter(expected => expected.in.every((value, index) => value === expectedInputs[index]));
        if (matching.length !== 1) throw new ActivityGradingError('The configured target must define every input combination once.');
        return { in: row.in, out: generated.outputs.map(key => matching[0].out[target.outputs.indexOf(key)]) };
      }) };
      score = compareTruthTables(generated, normalized);
      stateCheck.truthTableMatchPercent = score;
    } else if (type === 'arduino') {
      const a = arduinoAnswers.parse(input);
      const pool = z.array(z.string()).max(16).parse(JSON.parse(template.faultPool));
      const reversed = injectFaults(seed, pool, template.difficulty).includes('REVERSED_LED');
      const components: Record<string, CircuitComponent> = {
        led1: { id: 'led1', type: 'LED', pins: { anode: reversed ? 'bb-A11' : 'bb-A10', cathode: reversed ? 'bb-A10' : 'bb-A11' } },
        res1: { id: 'res1', type: 'RESISTOR', value: 220, pins: { p1: 'bb-B11', p2: 'bb-GND-1' } },
      };
      const lit = sketchOutputSnapshots(parseSketch(a.code)).some(voltages => resolveCircuit(components, a.wires, voltages).led1.isOn);
      stateCheck.ledSuccessfullyLit = Boolean(lit); score = lit ? 100 : 0;
    } else throw new ActivityGradingError('Unsupported activity assessment.');
  } catch (error) {
    if (error instanceof SketchSyntaxError) throw new ActivityGradingError(error.message);
    if (error instanceof ActivityGradingError) throw error;
    throw new ActivityGradingError('Invalid activity answers or missing supported assessment configuration.');
  }
  return { score, maxScore: 100, passed: score >= 70, stateCheck };
}
