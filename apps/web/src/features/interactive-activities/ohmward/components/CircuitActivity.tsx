'use client';
import { useState } from 'react';
import { ComponentSymbol } from './Shared';
import { evaluateSeriesLoop } from '../domain/circuit';
import type { Endpoint, Level, ResponseState } from '../domain/types';

const positions: Record<string, [number, number]> = { supply: [140, 80], control: [500, 80], limit: [500, 240], light: [140, 240] };
const endpointKey = (pin: Endpoint) => JSON.stringify([pin.componentId, pin.terminalId]);
export function CircuitActivity({ variant, state, onChange, disabled = false }: { variant: Level['variants'][number]; state: ResponseState; onChange: (state: ResponseState) => void; disabled?: boolean }) {
  const [selected, setSelected] = useState<Endpoint | null>(null), [error, setError] = useState(''), [running, setRunning] = useState(false);
  const [from, setFrom] = useState(''), [to, setTo] = useState('');
  const pins = variant.parts.flatMap(part => part.terminals.map((pin, i) => ({ endpoint: { componentId: part.id, terminalId: pin.id }, label: `${part.label}: ${pin.label}`, x: positions[part.id][0] + (i ? 78 : -78), y: positions[part.id][1], side: i ? 1 : -1 })));
  function connect(a: Endpoint, b: Endpoint) {
    if (disabled) return;
    const used = new Set(state.wires.flatMap(wire => [endpointKey(wire.from), endpointKey(wire.to)]));
    if (a.componentId === b.componentId || used.has(endpointKey(a)) || used.has(endpointKey(b))) { setError('Choose unused terminals on two different components. Remove an existing wire first if needed.'); return; }
    onChange({ ...state, wires: [...state.wires, { id: crypto.randomUUID(), from: a, to: b }] }); setSelected(null); setError(''); setRunning(false);
  }
  const result = evaluateSeriesLoop(variant, state.wires, state.switchClosed), illuminated = running && result.valid && result.closed;
  return <><p className="ohm-muted">Select two terminals, or use the connection form below. Four wires complete this lesson’s protected series loop.</p><svg viewBox="0 0 640 320" style={{ width: '100%', minHeight: 210, marginBlock: 12 }} aria-label="Fixed four-component circuit workspace" role="group">
    {state.wires.map(wire => { const a = pins.find(pin => endpointKey(pin.endpoint) === endpointKey(wire.from)), b = pins.find(pin => endpointKey(pin.endpoint) === endpointKey(wire.to)); if(!a||!b)return null; const rail=a.y===b.y?(a.y<160?16:304):160, ax=a.x+a.side*28, bx=b.x+b.side*28; return <path key={wire.id} d={`M${a.x},${a.y} H${ax} V${rail} H${bx} V${b.y} H${b.x}`} fill="none" stroke={illuminated ? 'var(--ohm-accent)' : 'var(--ohm-muted)'} strokeWidth="3" strokeLinejoin="round" className={illuminated ? 'ohm-signal' : ''}/>; })}
    {variant.parts.map(part => { const [x, y] = positions[part.id]; return <g key={part.id}><rect x={x-78} y={y-42} width="156" height="84" rx="12" fill="var(--ohm-ground)" stroke={part.kind === 'led' && illuminated ? 'var(--ohm-accent)' : 'var(--ohm-edge)'}/><foreignObject x={x-30} y={y-34} width="60" height="60"><ComponentSymbol kind={part.kind} size={60} closed={state.switchClosed}/></foreignObject><text x={x} y={y+32} textAnchor="middle" fontSize="14" fill="var(--ohm-ink)">{part.kind === 'resistor' ? `${variant.values.resistanceOhms} Ω` : part.kind === 'battery' ? `${variant.values.supplyVolts} V` : part.label}</text></g>; })}
    {pins.map(pin => <g key={endpointKey(pin.endpoint)}><circle cx={pin.x} cy={pin.y} r="9" fill={selected && endpointKey(selected) === endpointKey(pin.endpoint) ? 'var(--ohm-accent)' : 'var(--bg-surface)'} stroke="var(--ohm-accent)" strokeWidth="2"/><text x={pin.x} y={pin.y-20} textAnchor="middle" fontSize="13" fill="var(--ohm-ink)">{variant.parts.find(part=>part.id===pin.endpoint.componentId)?.terminals.find(item=>item.id===pin.endpoint.terminalId)?.label}</text><foreignObject x={pin.x-22} y={pin.y-22} width="44" height="44"><button disabled={disabled} style={{ width: 44, height: 44, borderRadius: '50%' }} aria-label={pin.label} aria-pressed={selected ? endpointKey(selected) === endpointKey(pin.endpoint) : false} onClick={() => selected ? connect(selected, pin.endpoint) : setSelected(pin.endpoint)}/></foreignObject></g>)}
  </svg>{selected && <p role="status">Selected {pins.find(pin => endpointKey(pin.endpoint) === endpointKey(selected))?.label}. Choose another terminal. <button className="ohm-button ohm-secondary" onClick={() => setSelected(null)}>Cancel connection</button></p>}
  <fieldset disabled={disabled}><legend className="sr-only">Connection form</legend><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 12 }}><label className="ohm-field">From terminal<select value={from} onChange={event => setFrom(event.target.value)}><option value="">Choose terminal</option>{pins.map((pin, i) => <option key={i} value={i}>{pin.label}</option>)}</select></label><label className="ohm-field">To terminal<select value={to} onChange={event => setTo(event.target.value)}><option value="">Choose terminal</option>{pins.map((pin, i) => <option key={i} value={i}>{pin.label}</option>)}</select></label></div><button className="ohm-button ohm-secondary" disabled={from === '' || to === ''} onClick={() => connect(pins[Number(from)].endpoint, pins[Number(to)].endpoint)}>Add wire</button></fieldset>
  {error && <p className="ohm-feedback" role="alert">{error}</p>}
  <ul className="ohm-connection-list" aria-label="Connected wires">{state.wires.map((wire, i) => <li key={wire.id}><span>{i+1}. {pins.find(pin => endpointKey(pin.endpoint) === endpointKey(wire.from))?.label} → {pins.find(pin => endpointKey(pin.endpoint) === endpointKey(wire.to))?.label}</span><button className="ohm-button ohm-secondary" disabled={disabled} aria-label={`Remove wire ${i+1}`} onClick={() => { onChange({ ...state, wires: state.wires.filter(item => item.id !== wire.id) }); setRunning(false); }}>Remove</button></li>)}</ul>
  <div className="ohm-actions"><button data-ohm-tour="switch" className="ohm-button ohm-secondary" aria-pressed={state.switchClosed} disabled={disabled} onClick={() => onChange({ ...state, switchClosed: !state.switchClosed })}>Switch {state.switchClosed ? 'closed' : 'open'}</button><button data-ohm-tour="run" className="ohm-button ohm-secondary" onClick={() => setRunning(value => !value)}>{running ? 'Stop test' : 'Run test'}</button></div>{running && <div className="ohm-feedback" role="status"><strong>{illuminated ? 'LED ON' : 'LED OFF'}</strong><p>{result.message}</p>{result.valid && <p>Estimated current: {result.currentMilliamps.toFixed(2)} mA · fixed {variant.values.ledForwardVolts} V LED drop</p>}</div>}</>;
}

export function SeriesDemo({variant}:{variant:Level['variants'][number]}) {
  const [state,setState]=useState<ResponseState>({answers:{},switchClosed:true,wires:[
    {id:'demo1',from:{componentId:'supply',terminalId:'positive'},to:{componentId:'control',terminalId:'left'}},
    {id:'demo2',from:{componentId:'control',terminalId:'right'},to:{componentId:'limit',terminalId:'left'}},
    {id:'demo3',from:{componentId:'limit',terminalId:'right'},to:{componentId:'light',terminalId:'anode'}},
    {id:'demo4',from:{componentId:'light',terminalId:'cathode'},to:{componentId:'supply',terminalId:'negative'}},
  ]});
  return <CircuitActivity variant={variant} state={state} onChange={setState}/>;
}
