"use client";

import { useState } from "react";
import { Code2 } from "lucide-react";
import type { CodeAnswerConfig } from "@/types/forms";

interface CodeAnswerInputProps {
  config?: CodeAnswerConfig;
  value?: string | null;
  onChange: (code: string) => void;
  disabled?: boolean;
}

export default function CodeAnswerInput({
  config,
  value,
  onChange,
  disabled = false,
}: CodeAnswerInputProps) {
  const language = config?.language || "javascript";
  const initial = value ?? config?.starterCode ?? "";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Enable tab indentation inside code editor
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextVal = textarea.value.substring(0, start) + "  " + textarea.value.substring(end);
      onChange(nextVal);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className="pt-2 rounded-2xl overflow-hidden border border-slate-800 bg-[#0E131F] text-slate-100">
      <div className="flex items-center justify-between px-4 py-2 bg-[#161D2E] border-b border-slate-800 text-[11px] font-mono text-slate-400">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-indigo-400" />
          <span className="uppercase">{language}</span>
        </div>
        <span className="text-[10px]">Press Tab to indent</span>
      </div>

      <textarea
        rows={8}
        value={value ?? initial}
        disabled={disabled}
        onKeyDown={handleKeyDown}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`// Write your ${language} solution here...`}
        className="w-full p-4 bg-transparent font-mono text-xs sm:text-sm text-emerald-400 placeholder:text-slate-600 focus:outline-hidden resize-y leading-relaxed"
        spellCheck={false}
      />
    </div>
  );
}
