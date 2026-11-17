export type SketchInstruction =
  | { op: 'mode'; pin: number; mode: 'INPUT' | 'OUTPUT' }
  | { op: 'write'; pin: number; value: 0 | 1 }
  | { op: 'wait'; ms: number }
  | { op: 'serial-begin'; baud: number }
  | { op: 'serial-line'; message: string };
export type SketchProgram = { setup: SketchInstruction[]; loop: SketchInstruction[] };
export class SketchSyntaxError extends Error {}

const reserved = new Set(('HIGH LOW INPUT OUTPUT INPUT_PULLUP pinMode digitalWrite delay Serial setup loop constructor __proto__ prototype ' +
  'alignas alignof and and_eq asm auto bitand bitor bool break case catch char class compl concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept not not_eq nullptr operator or or_eq private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while xor xor_eq byte').split(' '));

// Only double-quoted, unescaped ASCII literals are supported; comments are recognized outside them.
function stripComments(code: string): string {
  let result = '', quoted = false;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '"') quoted = !quoted;
    if (quoted && /[\r\n]/.test(code[i])) throw new SketchSyntaxError('Serial messages must stay on one line.');
    if (!quoted && code.slice(i, i + 2) === '//') {
      while (i < code.length && !/[\r\n]/.test(code[i])) i++;
      result += ' ';
    } else if (!quoted && code.slice(i, i + 2) === '/*') {
      const end = code.indexOf('*/', i + 2);
      if (end < 0) throw new SketchSyntaxError('Close every sketch comment.');
      i = end + 1;
      result += ' ';
    } else result += code[i];
  }
  if (quoted) throw new SketchSyntaxError('Close every Serial message literal.');
  return result.trim();
}

function statements(body: string): string[] {
  const result: string[] = [];
  let quoted = false, start = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '"') quoted = !quoted;
    if (!quoted && body[i] === ';') {
      if (body.slice(start, i).trim()) result.push(body.slice(start, i).trim());
      start = i + 1;
    }
  }
  if (quoted || body.slice(start).trim()) throw new SketchSyntaxError('Every sketch statement must end with a semicolon.');
  return result;
}

/** A bounded introductory sketch language. Source text is parsed as data and never executed. */
export function parseSketch(code: string): SketchProgram {
  if (typeof code !== 'string' || !code.length || code.length > 8000 || /\\|[^\x09\x0a\x0d\x20-\x7e]/.test(code)) {
    throw new SketchSyntaxError('Use an ASCII introductory sketch of at most 8000 characters, without backslash escapes or line continuations.');
  }
  let text = stripComments(code);
  const constants: Record<string, number> = Object.create(null);
  const decimal = (value: string) => {
    if (!/^(?:0|[1-9]\d*)$/.test(value)) throw new SketchSyntaxError('Use canonical decimal literals without leading zeroes.');
    return Number(value);
  };
  for (;;) {
    const declaration = /^(?:const\s+)?(int|byte)\s+([A-Za-z_]\w*)\s*=\s*(\d{1,5})\s*;\s*/.exec(text);
    if (!declaration) break;
    const value = decimal(declaration[3]), name = declaration[2];
    if (Object.keys(constants).length >= 32 || Object.hasOwn(constants, name) || reserved.has(name) || value > (declaration[1] === 'byte' ? 255 : 32767)) {
      throw new SketchSyntaxError('Use at most 32 unique bounded int/byte constants without reserved names.');
    }
    constants[name] = value;
    text = text.slice(declaration[0].length);
  }
  const functions = /^void\s+setup\s*\(\s*\)\s*\{((?:"[^"\r\n]*"|[^{}"])*)\}\s*void\s+loop\s*\(\s*\)\s*\{((?:"[^"\r\n]*"|[^{}"])*)\}\s*$/.exec(text);
  if (!functions) throw new SketchSyntaxError('Use setup/loop containing pinMode, digitalWrite, delay and literal Serial statements only.');
  const modes: Record<number, string> = Object.create(null);
  let count = 0, serialStarted = false;
  const block = (body: string): SketchInstruction[] => {
    return statements(body).map<SketchInstruction>(statement => {
      if (++count > 128) throw new SketchSyntaxError('Use at most 128 supported introductory sketch statements.');
      const begin = /^Serial\.begin\s*\(\s*(\d{1,6})\s*\)$/.exec(statement);
      if (begin) {
        const baud = decimal(begin[1]);
        if (![300, 1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200].includes(baud)) throw new SketchSyntaxError('Use a supported literal Serial baud rate.');
        serialStarted = true;
        return { op: 'serial-begin', baud };
      }
      const line = /^Serial\.println\s*\(\s*"([^"\r\n]{0,160})"\s*\)$/.exec(statement);
      if (line) {
        if (!serialStarted) throw new SketchSyntaxError('Call Serial.begin before Serial.println.');
        return { op: 'serial-line', message: line[1] };
      }
      const call = /^(pinMode|digitalWrite|delay)\s*\(\s*([A-Za-z_]\w*|\d+)\s*(?:,\s*(OUTPUT|INPUT|HIGH|LOW|0|1))?\s*\)$/.exec(statement);
      if (!call) throw new SketchSyntaxError('Use supported pin, delay and literal Serial statements only.');
      const value = /^\d+$/.test(call[2]) ? decimal(call[2]) : constants[call[2]];
      if (call[1] === 'delay') {
        if (call[3] || !Number.isInteger(value) || value < 1 || value > 10000) throw new SketchSyntaxError('Arduino delays must be 1–10000 literal milliseconds.');
        return { op: 'wait', ms: value };
      }
      if (!Number.isInteger(value) || value < 0 || value > 13) throw new SketchSyntaxError('Arduino GPIO pins must be 0–13.');
      if (call[1] === 'pinMode') {
        if (call[3] !== 'INPUT' && call[3] !== 'OUTPUT') throw new SketchSyntaxError('Use INPUT or OUTPUT pin mode.');
        modes[value] = call[3];
        return { op: 'mode', pin: value, mode: call[3] };
      }
      if (modes[value] !== 'OUTPUT' || !['HIGH', 'LOW', '0', '1'].includes(call[3])) throw new SketchSyntaxError('Set OUTPUT mode before writing HIGH or LOW.');
      return { op: 'write', pin: value, value: ['HIGH', '1'].includes(call[3]) ? 1 : 0 };
    });
  };
  const setup = block(functions[1]);
  const loop = block(functions[2]);
  return { setup, loop };
}

/** Grade one setup/loop pass using the same typed operations that drive browser preview. */
export function sketchOutputSnapshots(program: SketchProgram): Record<string, number>[] {
  const outputs: Record<string, number> = {}, snapshots: Record<string, number>[] = [];
  for (const instruction of [...program.setup, ...program.loop]) {
    if (instruction.op === 'mode' && instruction.mode === 'INPUT') delete outputs[`uno-${instruction.pin}`];
    if (instruction.op === 'write') {
      outputs[`uno-${instruction.pin}`] = instruction.value;
      snapshots.push({ ...outputs });
    }
  }
  return snapshots;
}
