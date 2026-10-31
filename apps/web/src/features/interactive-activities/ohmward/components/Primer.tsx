'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lightbulb, Cpu, Sun, ArrowRight, Power } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { PRIMER } from '../curriculum/catalog';

export function LampDemo() {
  const [light, setLight] = useState(65), [closed, setClosed] = useState(true);
  const on = light < 35 && closed, reduce = useReducedMotion();
  return <div className="ohm-inset"><label className="ohm-field">Ambient light: {light}%<input data-ohm-tour="lamp-light" aria-label="Ambient light" type="range" min="0" max="100" value={light} onChange={event => setLight(Number(event.target.value))}/></label><div className="ohm-pipeline" aria-label="Sensor to controller to output"><div><Sun aria-hidden="true"/><strong>Sensor</strong><p>{light}% light</p></div><div><Cpu aria-hidden="true"/><strong>Controller</strong><p>{light} &lt; 35?<br/>{light < 35 ? 'Yes' : 'No'}</p></div><motion.div className={on ? 'ohm-on' : ''} animate={{ scale: reduce || !on ? 1 : 1.025 }} transition={{ duration: .18 }}><Lightbulb aria-hidden="true" fill={on ? 'currentColor' : 'none'}/><strong>Lamp</strong><p role="status">{on ? 'ON' : 'OFF'}</p></motion.div></div><button data-ohm-tour="lamp-switch" className="ohm-button ohm-secondary" aria-pressed={closed} onClick={() => setClosed(value => !value)}><Power size={18} aria-hidden="true"/>Switch {closed ? 'closed' : 'open'}</button><p className="ohm-muted" style={{ marginTop: 12 }}>A normalized sensor reading and a protected LED circuit. At 35% the lamp is off.</p></div>;
}
export function Primer({ preview = false }: { preview?: boolean }) {
  const [step, setStep] = useState(0), [busy, setBusy] = useState(false), [error, setError] = useState(''); const router = useRouter(), reduce = useReducedMotion();
  async function finish() {
    setBusy(true); setError('');
    try { const response = await fetch('/api/ohmward/primer/complete', { method: 'POST' }); const data = await response.json(); if (!response.ok) throw Error(data.error); router.push('/ics/activities/ohmward/modules/circuitry'); router.refresh(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Could not save. Try again.'); setBusy(false); }
  }
  return <><div className="ohm-actions" style={{ marginBottom: 20 }}><span className="ohm-status">Start here · About five minutes · Ungraded</span></div><div className="ohm-intro ohm-surface"><div><motion.div key={step} initial={reduce ? false : { opacity: .5, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}><h2>{PRIMER.cards[step].title}</h2><p>{PRIMER.cards[step].body}</p></motion.div><p className="ohm-muted" style={{ marginBottom: 16 }}>Step {step + 1} of {PRIMER.cards.length}</p><div className="ohm-actions"><button className="ohm-button ohm-secondary" disabled={step === 0 || busy} onClick={() => setStep(value => value - 1)}>Back</button>{step < PRIMER.cards.length - 1 ? <button data-ohm-tour="primer-next" className="ohm-button" onClick={() => setStep(value => value + 1)}>Next <ArrowRight size={16} aria-hidden="true"/></button> : <button data-ohm-tour="primer-next" className="ohm-button" disabled={busy || preview} onClick={finish}>{preview ? 'Staff preview · no progress saved' : busy ? 'Saving…' : 'Start my journey'}</button>}</div>{error && <p className="ohm-feedback" role="alert">{error}</p>}</div><LampDemo/></div><p className="ohm-muted">Explore freely. Nothing in this introduction is graded.</p></>;
}
