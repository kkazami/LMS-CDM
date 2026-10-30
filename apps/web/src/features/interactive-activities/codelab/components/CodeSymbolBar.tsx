'use client';
import type { RefObject } from 'react';
export function CodeSymbolBar({ editor, value, onChange }: { editor: RefObject<HTMLTextAreaElement | null>; value: string; onChange: (value: string) => void }) {
  return <div aria-label="Code symbols" className="flex shrink-0 gap-1 overflow-x-auto border-t border-slate-200 bg-slate-50 px-2 py-1 dark:border-slate-700 dark:bg-slate-900">{['    ', '{', '}', '(', ')', '[', ']', ';', '=', ':', '<', '>'].map(symbol => <button key={symbol} type="button" aria-label={symbol.trim() ? `Insert ${symbol}` : 'Insert indentation'} className="min-h-11 min-w-11 shrink-0 rounded-lg font-mono text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-orange-600 dark:text-slate-100" onPointerDown={event => event.preventDefault()} onClick={() => {
    const input = editor.current;
    if (!input) return;
    const start = input.selectionStart, end = input.selectionEnd;
    onChange(value.slice(0, start) + symbol + value.slice(end));
    requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + symbol.length, start + symbol.length); });
  }}>{symbol.trim() || 'Tab'}</button>)}</div>;
}
