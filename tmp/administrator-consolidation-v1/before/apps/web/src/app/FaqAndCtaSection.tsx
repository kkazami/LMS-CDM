"use client";

import React, { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { HelpCircle, ChevronDown, Mail, ArrowRight } from "lucide-react";
import { motion, useInView } from "framer-motion";

interface FaqAndCtaSectionProps {
  reducedMotion: boolean;
  brand: {
    gold: string;
    goldLight: string;
    goldSubtle: string;
    red: string;
    redDeep: string;
    green: string;
    greenLight: string;
    navy: string;
    navyLight: string;
    cream: string;
    creamDark: string;
    white: string;
    slate: string;
    slateLight: string;
  };
}

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

// 5 verified FAQ items strictly grounded in the real implementation of this repository
const FAQ_ITEMS: FaqItem[] = [
  {
    id: "faq-exp-grades",
    question: "Does earning EXP or leveling up affect my official academic grades?",
    answer:
      "No. Official academic grades are computed strictly from completed coursework, quizzes, and faculty evaluations recorded in your course gradebook on the collegiate 1.00 to 5.00 grading scale. EXP, login streaks, and leaderboard tiers are extracurricular engagement milestones designed to promote consistent study habits, but they never modify or inflate official scholastic records.",
  },
  {
    id: "faq-department-portals",
    question: "How do I access the portal for my specific institute?",
    answer:
      "CdM LMS provides dedicated portals for the Institute of Computing Studies (ICS), Institute of Teacher Education (ITE), and Institute of Business and Entrepreneurship (IBE). You can choose your institute directly from the department deck on this page or select it upon sign-in. Your account is scoped to your enrolled department and routes you directly to its tailored coursework dashboard.",
  },
  {
    id: "faq-quiz-integrity",
    question: "How does automated integrity monitoring work during quizzes?",
    answer:
      "During timed assessments and quizzes, the platform logs informational events such as tab switching, copy-pasting, full-screen exits, and context menu interactions. These logs serve as an informational audit summary for your instructor to review; the platform never automatically fails, disqualifies, or locks out a student.",
  },
  {
    id: "faq-interactive-labs",
    question: "What interactive laboratories are built into coursework?",
    answer:
      "Depending on your institute and enrolled courses, CdM LMS integrates specialized browser-based interactive simulation environments: Monaco-powered CodeLab with remote code execution, Arduino microcontroller circuit breadboards, digital logic gate diagram simulators, 3D/2D PC build simulators, and server rack wiring modules.",
  },
  {
    id: "faq-account-access",
    question: "What credentials do I need to sign in, and how do I reset my password?",
    answer:
      "Sign in with your registered institutional email address and password. If you misplace your credentials, use the self-service password recovery page (/forgot-password) to receive a one-time verification code via email, or contact your department administrator at TODO_HELPDESK_EMAIL for account verification.",
  },
];

export default function FaqAndCtaSection({
  reducedMotion,
  brand,
}: FaqAndCtaSectionProps) {
  // ─── FAQ Section InView ───
  const faqRef = useRef<HTMLDivElement>(null);
  const isFaqInView = useInView(faqRef, { once: false, amount: 0.1 });

  // ─── Closing CTA Panel InView ───
  const ctaRef = useRef<HTMLDivElement>(null);
  const isCtaInView = useInView(ctaRef, { once: false, amount: 0.1 });

  // Synthetic resize-nudge on mount to ensure observers measure immediately on first paint
  useEffect(() => {
    const resizeTimer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);
    return () => clearTimeout(resizeTimer);
  }, []);

  // Accordion open state: Set of open question IDs (allows multiple open simultaneously, all start collapsed)
  const [openItemIds, setOpenItemIds] = useState<Set<string>>(new Set());

  const toggleItem = (id: string) => {
    setOpenItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <section
      id="faq"
      ref={faqRef}
      className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24"
      style={{ backgroundColor: "#0B0F19" }}
    >
      <div className="relative z-10 max-w-7xl mx-auto space-y-20 sm:space-y-28">
        {/* ════════════════════════════════════════════════════════════
            BLOCK 1 — FAQ (TWO-COLUMN LAYOUT: 5/12 LEFT, 7/12 RIGHT)
           ════════════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ─── LEFT COLUMN (~5/12): Eyebrow, Heading, Paragraph & Contact Affordance ─── */}
          <motion.div
            className="lg:col-span-5 text-left flex flex-col items-start"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isFaqInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: 0,
            }}
          >
            {/* Eyebrow Pill */}
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase border"
              style={{
                backgroundColor: "rgba(245, 196, 0, 0.08)",
                borderColor: "rgba(245, 196, 0, 0.28)",
                color: brand.gold,
              }}
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              Frequently Asked Questions
            </span>

            {/* Heading */}
            <h2 className="mt-3 text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white tracking-tight leading-[1.15]">
              Everything You Need to Know.{" "}
              <span style={{ color: brand.gold }}>Clear Answers.</span>
            </h2>

            {/* Supporting Paragraph */}
            <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
              Find verified information about departmental portals, coursework access,
              interactive laboratories, automated quiz integrity, and official grading policies.
            </p>

            {/* Contact Affordance with clearly marked placeholder */}
            <div className="mt-8 pt-6 border-t border-white/[0.08] w-full">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                Need additional assistance?
              </div>
              <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/[0.03] text-xs text-slate-300">
                <Mail className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Contact campus helpdesk:</span>
                <code className="font-mono text-amber-300 font-semibold px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/25">
                  TODO_HELPDESK_EMAIL
                </code>
              </div>
            </div>
          </motion.div>

          {/* ─── RIGHT COLUMN (~7/12): 5 Accordion Items Stacked Vertically ─── */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openItemIds.has(item.id);
              const buttonId = `faq-trigger-${item.id}`;
              const panelId = `faq-panel-${item.id}`;

              return (
                <motion.div
                  key={item.id}
                  className="rounded-2xl border transition-colors duration-200 backdrop-blur-md overflow-hidden"
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 20 }}
                  animate={
                    isFaqInView
                      ? { opacity: 1, y: 0 }
                      : { opacity: 0, y: reducedMotion ? 0 : 20 }
                  }
                  transition={{
                    duration: reducedMotion ? 0 : 0.45,
                    ease: "easeOut",
                    delay: reducedMotion ? 0 : 0.1 + idx * 0.06,
                  }}
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    borderColor: isOpen
                      ? "rgba(245, 196, 0, 0.35)"
                      : "rgba(255, 255, 255, 0.10)",
                    boxShadow: isOpen
                      ? "0 8px 24px rgba(0,0,0,0.35), 0 0 16px rgba(245, 196, 0, 0.08)"
                      : "0 4px 16px rgba(0,0,0,0.25)",
                  }}
                >
                  {/* Native interactive button with ARIA controls */}
                  <button
                    type="button"
                    id={buttonId}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => toggleItem(item.id)}
                    className="w-full flex items-center justify-between gap-4 p-5 sm:p-6 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-inset rounded-2xl transition-colors hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors"
                        style={{
                          backgroundColor: isOpen
                            ? "rgba(245, 196, 0, 0.15)"
                            : "rgba(255, 255, 255, 0.04)",
                          borderColor: isOpen
                            ? "rgba(245, 196, 0, 0.40)"
                            : "rgba(255, 255, 255, 0.08)",
                          color: isOpen ? brand.gold : "rgba(255, 255, 255, 0.65)",
                        }}
                      >
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <span className="text-base sm:text-lg font-bold text-white tracking-tight">
                        {item.question}
                      </span>
                    </div>

                    <ChevronDown
                      className={`w-5 h-5 shrink-0 transition-transform duration-300 ${
                        isOpen ? "rotate-180 text-amber-400" : "text-slate-400"
                      }`}
                    />
                  </button>

                  {/* Smooth height transition using CSS grid-template-rows (0fr -> 1fr) */}
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{
                      gridTemplateRows: isOpen ? "1fr" : "0fr",
                    }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6 pt-1 text-sm sm:text-base text-slate-300 leading-relaxed border-t border-white/[0.06] mt-1">
                        {item.answer}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════
            BLOCK 2 — CLOSING CTA (WIDE CENTERED PANEL)
           ════════════════════════════════════════════════════════════ */}
        <motion.div
          ref={ctaRef}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 24 }}
          animate={
            isCtaInView
              ? { opacity: 1, y: 0 }
              : { opacity: 0, y: reducedMotion ? 0 : 24 }
          }
          transition={{
            duration: reducedMotion ? 0 : 0.5,
            ease: "easeOut",
            delay: reducedMotion ? 0 : 0.15,
          }}
          className="relative rounded-3xl border border-white/10 p-8 sm:p-12 lg:p-16 text-center max-w-5xl mx-auto backdrop-blur-md"
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.95)",
            backgroundImage:
              "radial-gradient(circle at 50% 0%, rgba(245, 196, 0, 0.14) 0%, rgba(15, 23, 42, 0) 70%)",
            boxShadow:
              "0 20px 50px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
          }}
        >
          {/* Top subtle accent bar */}
          <div
            className="absolute top-0 left-1/4 right-1/4 h-1 rounded-full"
            style={{
              background: `linear-gradient(90deg, transparent, ${brand.gold}, transparent)`,
            }}
          />

          {/* CDM Crest (reusing /images/cdm-logo.png from navbar/hero) */}
          <div className="relative w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full overflow-hidden bg-white p-1 border-2 border-amber-400/50 shadow-xl mb-6">
            <Image
              src="/images/cdm-logo.png"
              alt="Colegio de Montalban Seal"
              fill
              sizes="96px"
              className="object-contain"
            />
          </div>

          {/* Short, confident headline */}
          <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            Ready to access your courses?
          </h3>

          {/* One or two lines of supporting copy */}
          <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl mx-auto">
            Sign in with your institutional credentials to enter your department portal,
            complete interactive classwork, and track your academic progress.
          </p>

          {/* Two buttons side by side */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 mt-8">
            {/* Primary Action -> Real login route (/login) */}
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide text-slate-950 bg-gradient-to-r from-amber-400 to-amber-300 hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-lg cursor-pointer"
            >
              <span>Sign in to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            {/* Secondary Outlined Action -> Anchor link to Institutes section */}
            <a
              href="#departments"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("departments")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm tracking-wide text-white border border-white/20 hover:bg-white/[0.05] active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <span>Explore Institutes</span>
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
