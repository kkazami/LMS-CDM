"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, User, Settings, BookOpen, Monitor, Award, LucideIcon } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { withOpacity } from "@/lib/theme";

import { FAQCategory, getFaqsForRole } from "./faq-data";

export function FaqCategoryList({
  theme,
  role,
  searchQuery,
}: {
  theme: InstituteTheme;
  role: string;
  searchQuery: string;
}) {
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Merge general with role-specific FAQs
  let allCategories = getFaqsForRole(role);

  // Filter based on searchQuery
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    allCategories = allCategories
      .map(cat => ({
        ...cat,
        faqs: cat.faqs.filter(faq => 
          faq.question.toLowerCase().includes(query) || 
          faq.answer.toLowerCase().includes(query)
        )
      }))
      .filter(cat => cat.faqs.length > 0);
  }

  const toggleFaq = (question: string) => {
    setOpenFaq(openFaq === question ? null : question);
  };

  if (allCategories.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No FAQs found for "{searchQuery}". Try a different term or contact support.
      </div>
    );
  }

  return (
    <div className="space-y-8 w-full max-w-4xl mx-auto">
      {allCategories.map((category, idx) => (
        <div key={idx} className="space-y-4">
          <div className="flex items-center space-x-2 text-xl font-semibold text-slate-800 dark:text-white">
            <category.icon className="w-6 h-6" style={{ color: theme.colors.primary }} />
            <span>{category.title}</span>
          </div>
          <div className="space-y-3">
            {category.faqs.map((faq, fIdx) => (
              <div 
                key={fIdx} 
                className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden bg-white dark:bg-[#1A1D27] hover:border-slate-300 dark:hover:border-white/20 transition-colors"
              >
                <button
                  className="w-full px-6 py-4 flex items-center justify-between text-left focus:outline-none focus-visible:bg-slate-50 cursor-pointer"
                  onClick={() => toggleFaq(faq.question)}
                >
                  <span className="font-medium text-slate-800 dark:text-slate-100">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFaq === faq.question ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === faq.question && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div 
                        className="px-6 pb-4 text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-white/5 pt-4"
                        style={{ backgroundColor: withOpacity(theme.colors.primary, 0.02) }}
                      >
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
