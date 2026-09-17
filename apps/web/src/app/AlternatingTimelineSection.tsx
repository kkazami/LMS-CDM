"use client";

import React, { useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  Compass,
  Layers,
  BarChart3,
  Building2,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

interface AlternatingTimelineSectionProps {
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

interface TimelineEntry {
  id: string;
  number: string;
  headline: string;
  body: string;
  side: "left" | "right";
  icon: LucideIcon;
}

const TIMELINE_ENTRIES: TimelineEntry[] = [
  {
    id: "timeline-workspace",
    number: "01",
    headline: "ALL ACADEMICS IN ONE PLACE",
    body: "Coursework, syllabi, interactive laboratories, flashcards, and official announcements are consolidated into a single platform. Students and faculty no longer have to track assignments across separate chat groups, unorganized cloud drives, or disparate social threads. Everything required for the semester is accessible directly from one unified dashboard.",
    side: "left",
    icon: Layers,
  },
  {
    id: "timeline-grades",
    number: "02",
    headline: "GRADES AND PROGRESS IN REAL TIME",
    body: "Coursework submissions and completed assessments update your academic record immediately on the collegiate 1.00 to 5.00 grading scale. Students can monitor course completion percentages and verified evaluations without waiting for end-of-term reports. Faculty gain immediate visibility into submission volumes and class performance.",
    side: "right",
    icon: BarChart3,
  },
  {
    id: "timeline-institutes",
    number: "03",
    headline: "BUILT FOR CDM'S THREE INSTITUTES",
    body: "CdM LMS is structured specifically around the Colegio de Montalban curriculum rather than an off-the-shelf system. Dedicated portals serve the Institute of Computing Studies (ICS), Institute of Teacher Education (ITE), and Institute of Business and Entrepreneurship (IBE). Each institute operates with its own distinct theme, course catalog, and department-specific workflows.",
    side: "left",
    icon: Building2,
  },
  {
    id: "timeline-integrity",
    number: "04",
    headline: "ACADEMIC INTEGRITY BUILT IN",
    body: "Timed assessments feature automated attempt monitoring that records tab switching, copy-pasting, and full-screen exits. These event logs provide instructors with an informational audit trail to evaluate quiz submissions fairly without automated lockouts. Strict role-based permissions ensure student data and answer keys remain secure.",
    side: "right",
    icon: ShieldCheck,
  },
  {
    id: "timeline-students",
    number: "05",
    headline: "BUILT BY STUDENTS WHO USE IT",
    body: "CdM LMS was developed directly by students enrolled in Colegio de Montalban who understand classroom realities firsthand. Features are designed to resolve genuine academic friction, from deadline tracking to specialized laboratory environments. Daily use continuously shapes development, ensuring the system remains practical and responsive.",
    side: "left",
    icon: Users,
  },
];

/**
 * Transparent Glass Card with Monochrome Typography & Soft Radial Light Pool
 */
function TimelineCardContent({ entry }: { entry: TimelineEntry }) {
  const Icon = entry.icon;

  return (
    <div className="relative w-full">
      {/* Soft radial lighter area behind card creating a gentle pool of light */}
      <div
        className="absolute inset-0 scale-105 pointer-events-none -z-10 rounded-2xl sm:rounded-3xl opacity-60 blur-lg"
        style={{
          background:
            "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(255, 255, 255, 0.045) 0%, rgba(255, 255, 255, 0.012) 50%, transparent 80%)",
        }}
        aria-hidden="true"
      />

      {/* Glass-style panel: 4.5% low-opacity white background, hairline white border, soft dark shadow */}
      <div
        className="group relative p-6 sm:p-7 rounded-2xl sm:rounded-3xl border backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-white/[0.16]"
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.045)",
          borderColor: "rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.35)",
        }}
      >
        {/* Header row: Index & Icon in neutral grey */}
        <div className="flex items-center justify-between gap-3 mb-3.5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
              style={{
                backgroundColor: "rgba(255, 255, 255, 0.035)",
                borderColor: "rgba(255, 255, 255, 0.08)",
              }}
            >
              <Icon className="w-4 h-4 text-zinc-400" />
            </div>
            <span className="text-[11px] font-mono font-medium tracking-[0.2em] text-zinc-400">
              {entry.number}
            </span>
          </div>
        </div>

        {/* Headline: Pure White uppercase */}
        <h3 className="text-sm sm:text-base font-extrabold uppercase text-white tracking-wider leading-snug">
          {entry.headline}
        </h3>

        {/* Body copy: Muted grey-white */}
        <p className="mt-2.5 text-xs sm:text-sm text-zinc-300/80 leading-relaxed">
          {entry.body}
        </p>
      </div>
    </div>
  );
}

/**
 * Desktop Individual Timeline Row with useInView scroll-reveal
 * Cards are 51% width and cross the center line so the line runs behind them
 */
function DesktopTimelineRow({
  entry,
  index,
  reducedMotion,
}: {
  entry: TimelineEntry;
  index: number;
  reducedMotion: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rowRef, { once: false, amount: 0.15 });
  const isLeft = entry.side === "left";

  return (
    <div ref={rowRef} className="relative flex items-center w-full min-h-[160px]">
      {isLeft ? (
        <motion.div
          initial={{ opacity: 0, x: reducedMotion ? 0 : -36 }}
          animate={
            isInView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: reducedMotion ? 0 : -36 }
          }
          transition={{
            duration: reducedMotion ? 0 : 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: reducedMotion ? 0 : index * 0.06,
          }}
          className="w-[51%] mr-auto relative z-20"
        >
          <TimelineCardContent entry={entry} />
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, x: reducedMotion ? 0 : 36 }}
          animate={
            isInView
              ? { opacity: 1, x: 0 }
              : { opacity: 0, x: reducedMotion ? 0 : 36 }
          }
          transition={{
            duration: reducedMotion ? 0 : 0.5,
            ease: [0.16, 1, 0.3, 1],
            delay: reducedMotion ? 0 : index * 0.06,
          }}
          className="w-[51%] ml-auto relative z-20"
        >
          <TimelineCardContent entry={entry} />
        </motion.div>
      )}
    </div>
  );
}

/**
 * Mobile Card Row (<lg)
 */
function MobileTimelineRow({
  entry,
  index,
  reducedMotion,
}: {
  entry: TimelineEntry;
  index: number;
  reducedMotion: boolean;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(rowRef, { once: false, amount: 0.15 });

  return (
    <div ref={rowRef} className="relative flex items-center w-full overflow-hidden">
      <motion.div
        initial={{ opacity: 0, x: reducedMotion ? 0 : 28 }}
        animate={
          isInView
            ? { opacity: 1, x: 0 }
            : { opacity: 0, x: reducedMotion ? 0 : 28 }
        }
        transition={{
          duration: reducedMotion ? 0 : 0.5,
          ease: [0.16, 1, 0.3, 1],
          delay: reducedMotion ? 0 : index * 0.06,
        }}
        className="w-full relative z-20 pl-10 sm:pl-16"
      >
        <TimelineCardContent entry={entry} />
      </motion.div>
    </div>
  );
}

export default function AlternatingTimelineSection({
  reducedMotion,
  brand,
}: AlternatingTimelineSectionProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const isHeaderInView = useInView(sectionRef, { once: false, amount: 0.1 });

  // Scroll-drawn connecting line progress:
  // Starts when timeline enters center, reaches full length exactly as LAST card finishes entering viewport
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start center", "end 85%"],
  });

  // Spring-smoothed scroll progress without jitter on fast scroll
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 28,
    restDelta: 0.001,
  });

  const scaleY = useTransform(smoothProgress, (val) =>
    reducedMotion ? 1 : Math.max(0, Math.min(1, val))
  );

  return (
    <section
      id="why-cdm-lms"
      ref={sectionRef}
      className="relative px-4 sm:px-6 lg:px-8 py-16 sm:py-24 min-h-[850px] lg:min-h-[920px] overflow-hidden"
      style={{ backgroundColor: "#04060A" }}
    >
      <div className="relative z-10 max-w-5xl mx-auto">
        {/* ─── Centered Section Header ─── */}
        <div className="text-center mb-16 sm:mb-20">
          {/* Eyebrow: Retains CDM Gold */}
          <motion.div
            className="flex items-center justify-center gap-2 mb-3"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isHeaderInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: 0,
            }}
          >
            <span
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-[0.2em] uppercase border"
              style={{
                backgroundColor: "rgba(245, 196, 0, 0.08)",
                borderColor: "rgba(245, 196, 0, 0.28)",
                color: brand.gold,
              }}
            >
              <Compass className="w-3.5 h-3.5 text-amber-400" />
              Architectural Foundations
            </span>
          </motion.div>

          {/* Heading: Pure White with CDM Gold Accent Phrase */}
          <motion.h2
            className="text-3xl sm:text-4xl lg:text-[2.65rem] font-extrabold text-white tracking-tight leading-[1.15]"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isHeaderInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.05,
            }}
          >
            Why CdM LMS.{" "}
            <span style={{ color: brand.gold }}>Built with Intent.</span>
          </motion.h2>

          {/* Subheading: Muted grey-white */}
          <motion.p
            className="mt-3 text-sm sm:text-base text-zinc-300/85 leading-relaxed max-w-2xl mx-auto"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
            animate={
              isHeaderInView
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: reducedMotion ? 0 : 16 }
            }
            transition={{
              duration: reducedMotion ? 0 : 0.45,
              ease: "easeOut",
              delay: reducedMotion ? 0 : 0.1,
            }}
          >
            Five deliberate design decisions grounded in the real academic workflows of Colegio de Montalban.
          </motion.p>
        </div>

        {/* ─── Alternating Timeline Container ─── */}
        <div ref={timelineRef} className="relative">
          {/*
            STRAIGHT VERTICAL LINE:
            - Exactly ONE line element in the section.
            - Low-opacity crisp CDM gold, no blur, no glow, no shadow.
            - Spans from the top of the first card (top-0) to the vertical center of the last card (bottom-24).
            - Positioned at left: 50% (desktop) / left-6 sm:left-8 (mobile).
            - Renders behind the cards (z-10, cards are z-20).
            - Scroll growth driven by scaleY with transformOrigin: "top center".
          */}
          <motion.div
            className="absolute top-0 bottom-24 left-6 sm:left-8 lg:left-1/2 -translate-x-1/2 w-[2px] pointer-events-none z-10"
            style={{
              backgroundColor: "rgba(245, 196, 0, 0.35)",
              scaleY: reducedMotion ? 1 : scaleY,
              transformOrigin: "top center",
            }}
            aria-hidden="true"
          />

          {/* ─── DESKTOP CARDS (hidden on mobile) ─── */}
          <div className="hidden lg:flex lg:flex-col space-y-16 lg:space-y-20 relative z-20">
            {TIMELINE_ENTRIES.map((entry, idx) => (
              <DesktopTimelineRow
                key={entry.id}
                entry={entry}
                index={idx}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>

          {/* ─── MOBILE LAYOUT (<lg): Spine on far left, stacked cards to the right ─── */}
          <div className="lg:hidden space-y-12 sm:space-y-16 relative z-20">
            {TIMELINE_ENTRIES.map((entry, idx) => (
              <MobileTimelineRow
                key={entry.id}
                entry={entry}
                index={idx}
                reducedMotion={reducedMotion}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
