"use client";

import React, { useState } from "react";
import { Check, Copy, Terminal } from "lucide-react";

interface KxCodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export default function KxCodeBlock({
  code,
  language = "code",
  className = "",
}: KxCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const lines = code.trimEnd().split("\n");

  return (
    <div
      className={`relative my-4 rounded-xl border border-slate-800 bg-slate-950/90 shadow-lg backdrop-blur-md overflow-hidden text-slate-100 ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-2 font-mono">
          <Terminal className="h-3.5 w-3.5 text-orange-400" />
          <span className="uppercase tracking-wider font-semibold text-slate-300">
            {language || "code"}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copy code"
          className="flex items-center gap-1.5 rounded px-2 py-1 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code body with line numbers */}
      <div className="overflow-x-auto p-4 font-mono text-sm leading-relaxed">
        <pre className="flex">
          {/* Line Numbers */}
          <span
            className="select-none pr-4 text-right text-slate-600 font-mono text-xs leading-relaxed"
            aria-hidden="true"
          >
            {lines.map((_, i) => (
              <span key={i} className="block">
                {i + 1}
              </span>
            ))}
          </span>

          {/* Code content */}
          <code className="flex-1 text-slate-100 whitespace-pre">
            {lines.map((line, idx) => (
              <span key={idx} className="block">
                {line || " "}
              </span>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}
