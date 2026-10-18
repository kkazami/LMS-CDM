"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, User, Settings, BookOpen, Monitor, Award, LucideIcon } from "lucide-react";
import type { InstituteTheme } from "@/lib/theme";
import { withOpacity } from "@/lib/theme";

type FAQ = {
  question: string;
  answer: string;
};

type FAQCategory = {
  title: string;
  icon: LucideIcon;
  faqs: FAQ[];
};

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

  const studentFaqs: FAQCategory[] = [
    {
      title: "Academic & Courses",
      icon: BookOpen,
      faqs: [
        { question: "How do I submit an assignment?", answer: "Go to your course dashboard, select the assignment from the Syllabus tab, and click 'Submit Work'. You can attach files or paste links." },
        { question: "Where can I see my grades?", answer: "Your grades are visible on the 'Grades' tab within each course." },
        { question: "How do I join a student group?", answer: "Groups are formed by your instructor. If you've been added to a group, it will appear on your course dashboard." },
      ],
    },
    {
      title: "Gamification & EXP",
      icon: Award,
      faqs: [
        { question: "How do I earn EXP?", answer: "EXP is earned by completing assignments, maintaining daily login streaks, earning badges, and participating in CodLab activities." },
        { question: "What are the level tiers?", answer: "Tiers range from Newcomer (Level 1) up to Legend, unlocking new profile badges and perks." },
        { question: "How does the login streak work?", answer: "Log in consecutively every day to increase your streak multiplier, which grants bonus EXP." },
      ],
    },
  ];

  const instructorFaqs: FAQCategory[] = [
    {
      title: "Course Management",
      icon: Settings,
      faqs: [
        { question: "How do I create an assignment?", answer: "In your course dashboard, navigate to the 'Syllabus' tab and click 'Create Item'. Choose 'Assignment' and fill in the details." },
        { question: "How do I grade student submissions?", answer: "Open the assignment, click on 'Submissions', and you can review and grade each student's work individually." },
        { question: "How do I broadcast a notification to all students?", answer: "Use the 'Announcements' feature or send a direct broadcast notification from the course settings." },
      ],
    },
    {
      title: "Gamification & Incentives",
      icon: Award,
      faqs: [
        { question: "How do I set up a Grade Incentive?", answer: "Go to Course Settings > Gamification, and you can define rules like 'Perfect Score Bonus' to automatically reward students." },
        { question: "Can I customize badges?", answer: "Currently, badges are system-wide, but you can create specific course milestones that trigger EXP rewards." },
      ],
    },
  ];

  const generalFaqs: FAQCategory[] = [
    {
      title: "Account & Security",
      icon: User,
      faqs: [
        { question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login screen, or go to Account Settings > Security to change it." },
        { question: "How do I revoke an active session?", answer: "Visit the Privacy Settings page to view and revoke any active sessions." },
        { question: "How do I change my avatar?", answer: "Click your profile picture in the top right, select 'Profile', and then click on your avatar to upload a new one." },
      ],
    },
    {
      title: "Technical Support",
      icon: Monitor,
      faqs: [
        { question: "The 3D Module isn't loading.", answer: "Make sure you are using a modern browser (Chrome, Edge, Firefox) and hardware acceleration is enabled." },
        { question: "I'm experiencing lag.", answer: "Try closing other heavy tabs or applications. Ensure you have a stable internet connection." },
      ],
    },
  ];

  // Merge general with role-specific FAQs
  let allCategories = [...(role === "STUDENT" ? studentFaqs : instructorFaqs), ...generalFaqs];

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
