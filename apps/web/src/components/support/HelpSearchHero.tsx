"use client";

import { Search, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { InstituteTheme } from "@/lib/theme";
import { withOpacity } from "@/lib/theme";

export function HelpSearchHero({
  theme,
  searchQuery,
  onSearchChange,
}: {
  theme: InstituteTheme;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const customBezier: [number, number, number, number] = [0.32, 0.72, 0, 1];

  return (
    <div className="w-full py-24 md:py-32 px-4 relative flex flex-col items-center justify-center">
      {/* Absolute Background Ambient Glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div 
          className="w-200 h-125 rounded-full opacity-[0.04] dark:opacity-[0.08] blur-[120px]"
          style={{ backgroundColor: theme.colors.primary }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center text-center">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: customBezier }}
          className="mb-8"
        >
          <span 
            className="rounded-full px-4 py-1.5 text-[11px] uppercase tracking-[0.25em] font-bold"
            style={{ 
              backgroundColor: withOpacity(theme.colors.primary, 0.1),
              color: theme.colors.primary 
            }}
          >
            {theme.name} Support
          </span>
        </motion.div>

        {/* Massive Typography */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: customBezier }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-tight"
        >
          How can we <br className="hidden md:block" /> help you today?
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: customBezier }}
          className="text-lg md:text-xl text-slate-500 dark:text-slate-400 mb-12 max-w-xl"
        >
          Search across student guides, technical documentation, and common FAQs.
        </motion.p>

        {/* The Double-Bezel Search Input */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: customBezier }}
          className="w-full max-w-2xl relative"
        >
          {/* Outer Shell */}
          <div className="p-2 rounded-4xl bg-slate-100/50 dark:bg-white/5 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl">
            {/* Inner Core */}
            <div className="relative flex items-center bg-white dark:bg-[#1A1D27] rounded-3xl shadow-sm dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] overflow-hidden transition-all duration-500 group focus-within:ring-2" style={{ "--tw-ring-color": withOpacity(theme.colors.primary, 0.5) } as React.CSSProperties}>
              <div className="pl-6 pr-3 py-4 text-slate-400">
                <Search className="w-6 h-6" strokeWidth={1.5} />
              </div>
              
              <input
                type="text"
                className="w-full bg-transparent border-none text-lg md:text-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-0 py-4 h-18"
                placeholder="E.g., How do I submit an assignment?"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />

              {/* Trailing Button-in-Button */}
              <div className="pr-2">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center transition-transform duration-500 group-focus-within:scale-105"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <ArrowRight className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
