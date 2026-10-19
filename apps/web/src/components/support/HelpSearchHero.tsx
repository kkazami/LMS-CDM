"use client";

import { Search, ArrowRight, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { InstituteTheme } from "@/lib/theme";
import { withOpacity } from "@/lib/theme";
import { getFaqsForRole } from "./faq-data";
import { useRef, useEffect, useState } from "react";

export function HelpSearchHero({
  theme,
  role,
  searchQuery,
  onSearchChange,
}: {
  theme: InstituteTheme;
  role: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}) {
  const customBezier: [number, number, number, number] = [0.32, 0.72, 0, 1];
  const [isFocused, setIsFocused] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside (or if we had a dedicated state, but here we just rely on focus/blur, though blur needs a timeout to allow clicks)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const allCategories = getFaqsForRole(role);
  let searchResults: { question: string; answer: string; categoryTitle: string }[] = [];
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    allCategories.forEach((cat) => {
      cat.faqs.forEach((faq) => {
        if (faq.question.toLowerCase().includes(query) || faq.answer.toLowerCase().includes(query)) {
          searchResults.push({ ...faq, categoryTitle: cat.title });
        }
      });
    });
  }

  const showDropdown = isFocused && searchQuery.length > 0;

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

        {/* Minimalist Premium Search Input */}
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: customBezier }}
          className="w-full max-w-2xl relative group"
        >
          {/* Animated Glow Behind (visible on focus) */}
          <div 
            className={`absolute -inset-1 rounded-[2.5rem] blur-xl transition-opacity duration-700 pointer-events-none ${isFocused ? 'opacity-20 dark:opacity-15' : 'opacity-0'}`}
            style={{ backgroundColor: theme.colors.primary }}
          />
          
          <div 
            className={`relative flex items-center bg-white dark:bg-[#1A1D27]/90 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] overflow-hidden transition-all duration-500 hover:border-slate-300 dark:hover:border-white/20 ${isFocused ? 'border-transparent ring-2' : ''}`} 
            style={{ "--tw-ring-color": theme.colors.primary } as React.CSSProperties}
          >
            <div className={`pl-6 pr-4 py-4 transition-colors duration-300 ${isFocused ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
              <Search className="w-6 h-6" strokeWidth={2} />
            </div>
            
            <input
              type="text"
              className="w-full bg-transparent border-none text-lg md:text-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 py-5 h-16 md:h-20"
              placeholder="E.g., How do I submit an assignment?"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setIsFocused(true)}
            />
          </div>

          {/* Autocomplete Dropdown */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="absolute top-full left-0 right-0 mt-4 bg-white dark:bg-[#1E2132] border border-slate-200 dark:border-[#3D4460] rounded-3xl shadow-2xl overflow-hidden z-50 flex flex-col max-h-100"
              >
                {searchResults.length > 0 ? (
                  <div className="overflow-y-auto py-2">
                    {searchResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className="px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/2 transition-colors border-b last:border-b-0 border-slate-100 dark:border-white/5 text-left group cursor-pointer"
                        onClick={() => {
                          // Handle selection if needed (could scroll to faq or just close dropdown)
                          setIsFocused(false);
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                            {result.categoryTitle}
                          </span>
                        </div>
                        <h4 className="text-[15px] font-semibold text-slate-900 dark:text-[#F0F2F8] group-hover:text-primary transition-colors mb-1">
                          {result.question}
                        </h4>
                        <p className="text-sm text-slate-500 dark:text-[#8B92A5] line-clamp-2 leading-relaxed">
                          {result.answer}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 font-medium">No results found for "{searchQuery}"</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
