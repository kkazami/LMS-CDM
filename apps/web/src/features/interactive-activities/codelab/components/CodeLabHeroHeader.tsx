"use client";

import React, { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { TypingBanner } from "@/components/motion/TypingBanner";
import { LANGUAGE_LOGO_MAP } from "./LanguageLogos";
import styles from "./CodeLabHeroHeader.module.css";

const LOGOS = Object.values(LANGUAGE_LOGO_MAP);
const BANNER_LOGOS = [...LOGOS, ...LOGOS];

interface CodeLabHeroHeaderProps {
  institute: string;
}

export default function CodeLabHeroHeader({ institute: _institute }: CodeLabHeroHeaderProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let inView = false;
    const update = () => setRunning(inView && !document.hidden);
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      update();
    });
    if (bannerRef.current) observer.observe(bannerRef.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  return (
    <div ref={bannerRef} className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-white dark:bg-[#141721] border border-slate-200/80 dark:border-white/5 shadow-xs transition-colors">
      <div className={styles.wave} data-running={running} aria-hidden="true">
        <div className={styles.row}>
          {[0, 1].map((copy) => (
            <div key={copy} className={styles.group}>
              {BANNER_LOGOS.map((Logo, index) => (
                <div key={index} className={styles.tile} style={{ animationDelay: `${index * -0.3375}s` }}>
                  <Logo size={22} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      {/* ── Foreground Text (Dual-Theme Light & Dark) ── */}
      <div className="relative z-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-500/10 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 text-xs font-bold border border-orange-500/20 dark:border-orange-500/30">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ICS Interactive CodeLab Tracks</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]">
          <TypingBanner
            text="Choose Your Learning Track"
            speed={35}
            cursorColor="#FF7517"
            className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-[#F0F2F8]"
          />
        </h1>
        <p className="text-slate-600 dark:text-[#8B92A5] text-xs sm:text-sm max-w-2xl leading-relaxed font-normal">
          Step-by-step programming mastery inspired by W3Schools. 30 guided levels per track — from
          fundamental syntax to algorithmic thinking. Complete Level N to unlock Level N+1.
        </p>
      </div>
    </div>
  );
}
