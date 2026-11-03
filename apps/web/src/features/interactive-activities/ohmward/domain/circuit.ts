import type { CircuitWire, Endpoint, Level } from './types';

const key = (endpoint: Endpoint) => JSON.stringify([endpoint.componentId, endpoint.terminalId]);
export type CircuitResult = { valid: boolean; closed: boolean; currentMilliamps: number; message: string; misconception: string | null };

/** Deliberately supports only the supplied four-part series-loop lesson. */
export function evaluateSeriesLoop(variant: Level['variants'][number], wires: CircuitWire[], switchClosed: boolean): CircuitResult {
  const fail = (message: string, misconception: string): CircuitResult => ({ valid: false, closed: false, currentMilliamps: 0, message, misconception });
  const terminals = new Set(variant.parts.flatMap(part => part.terminals.map(pin => key({ componentId: part.id, terminalId: pin.id }))));
  if (terminals.size !== 8 || variant.parts.length !== 4) return fail('This activity supports the supplied four-part loop only.', 'unsupported-topology');
  if (wires.length !== 4) return fail('Use four wires to join the eight terminals into one complete loop.', 'open-path');
  const adjacency = new Map<string, string[]>(); const wireIds = new Set<string>();
  const add = (a: string, b: string) => { adjacency.set(a, [...(adjacency.get(a) ?? []), b]); adjacency.set(b, [...(adjacency.get(b) ?? []), a]); };
  const used = new Set<string>();
  for (const wire of wires) {
    const a = key(wire.from), b = key(wire.to);
    if (wireIds.has(wire.id) || !terminals.has(a) || !terminals.has(b) || wire.from.componentId === wire.to.componentId || used.has(a) || used.has(b)) return fail('Each real terminal needs exactly one wire to a different component. Remove duplicates or bypasses.', 'invalid-terminal');
    wireIds.add(wire.id); used.add(a); used.add(b); add(a, b);
  }
  for (const part of variant.parts.filter(part => part.kind !== 'battery')) add(key({ componentId: part.id, terminalId: part.terminals[0].id }), key({ componentId: part.id, terminalId: part.terminals[1].id }));
  const positive = key({ componentId: 'supply', terminalId: 'positive' });
  const negative = key({ componentId: 'supply', terminalId: 'negative' });
  const visited: string[] = []; let previous = ''; let current = positive;
  while (visited.length <= 8) {
    if (visited.includes(current)) return fail('The wires form a separate cycle. Connect every component between the battery terminals.', 'unsupported-topology');
    visited.push(current); if (current === negative) break;
    const next = (adjacency.get(current) ?? []).filter(value => value !== previous);
    if (next.length !== 1) return fail('Complete one uninterrupted path through every component.', 'open-path');
    previous = current; current = next[0];
  }
  if (visited.length !== 8 || current !== negative) return fail('The power path bypasses a component or shorts the battery. Use every component in series.', 'bypassed-component');
  if (visited.indexOf(key({ componentId: 'light', terminalId: 'anode' })) > visited.indexOf(key({ componentId: 'light', terminalId: 'cathode' }))) return fail('Reverse the LED: conventional current must enter its anode and leave its cathode.', 'reversed-led');
  const { supplyVolts, ledForwardVolts, resistanceOhms, maximumCurrentMilliamps } = variant.values;
  const milliamps = (supplyVolts - ledForwardVolts) / resistanceOhms * 1000;
  if (!Number.isFinite(milliamps) || resistanceOhms <= 0 || milliamps <= 0 || milliamps > maximumCurrentMilliamps) return fail('The specified supply and resistance do not produce a supported protected LED current.', 'unsafe-current');
  return { valid: true, closed: switchClosed, currentMilliamps: switchClosed ? milliamps : 0, message: switchClosed ? 'Complete loop: current passes through the resistor and LED.' : 'Open switch: the path is interrupted and the LED is off.', misconception: null };
}
