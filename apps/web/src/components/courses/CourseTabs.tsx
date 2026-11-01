"use client";

import { useEffect, useState, useId, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { InstituteTheme } from "@/lib/theme";
import { MessageSquare, BookOpen, Users, BarChart2, Radio, Activity, ClipboardCheck, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";

interface CourseTabsProps {
  courseId: string;
  instituteCode: string;
  theme: InstituteTheme;
  pendingCount?: number;
  pendingWorkCount?: number;
  isInstructor?: boolean;
  /** True only when the current course is ITE and user is instructor */
  showParticipation?: boolean;
  attendanceOnly?: boolean;
}

export default function CourseTabs({
  courseId,
  instituteCode,
  theme,
  pendingCount = 0,
  pendingWorkCount = 0,
  isInstructor = false,
  showParticipation = false,
  attendanceOnly = false,
}: CourseTabsProps) {
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [canToggle, setCanToggle] = useState(false);
  const compactView = canToggle && compact;
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const navId = useId();
  const activeTabRef = useRef<HTMLAnchorElement>(null);
  useEffect(() => {
    let preference: string | null = null;
    try { preference = localStorage.getItem('course-tabs-compact'); } catch { /* Storage may be unavailable. */ }
    setCompact(preference === null ? true : preference === 'true');
  }, []);
  const toggleLabels = () => {
    const next = !compact; setCompact(next);
    try { localStorage.setItem('course-tabs-compact', String(next)); } catch { /* The toggle still works without storage. */ }
  };

  type Tab = { key: string; label: string; icon: LucideIcon };
  const TABS: Tab[] = [
    { key: "stream", label: "Stream", icon: MessageSquare },
    { key: "classwork", label: "Classwork", icon: BookOpen },
    { key: "people", label: "People", icon: Users },
    { key: "attendance", label: "Attendance", icon: ClipboardCheck },
    ...(isInstructor
      ? [
          { key: "broadcast", label: "Broadcast", icon: Radio },
          { key: "gradebook", label: "Gradebook", icon: BarChart2 },
        ]
      : []),
    // ITE-only: only rendered when showParticipation=true (server-enforced)
    ...(showParticipation
      ? [{ key: "participation", label: "Participation", icon: Activity }]
      : []),
  ];
  useEffect(() => {
    const container = containerRef.current; const measurement = measurementRef.current;
    if (!container || !measurement) return;
    let active = true;
    const measure = () => {
      if (!active) return;
      const style = getComputedStyle(container);
      const available = container.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      setCanToggle(!attendanceOnly && window.matchMedia('(max-width: 767px)').matches && measurement.scrollWidth > available + 1);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(container); observer.observe(measurement);
    window.addEventListener('resize', measure); measure();
    void document.fonts.ready.then(measure);
    return () => { active = false; observer.disconnect(); window.removeEventListener('resize', measure); };
  }, [attendanceOnly, isInstructor, showParticipation, pendingCount, pendingWorkCount]);
  useEffect(() => {
    if (!compactView) activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'auto' });
  }, [pathname, compactView]);

  return (
    <div className="border-b border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#12151E] transition-colors">
      <div ref={containerRef} className="relative max-w-5xl mx-auto flex items-center gap-1 px-1 sm:px-4">
        <div aria-hidden="true" className="pointer-events-none invisible absolute inset-0 overflow-hidden"><div ref={measurementRef} className="flex w-max whitespace-nowrap">{TABS.filter(tab => !attendanceOnly || tab.key === 'attendance').map(tab => {
          const Icon = tab.icon; const count = tab.key === 'people' ? pendingCount : tab.key === 'gradebook' ? pendingWorkCount : 0;
          return <span key={tab.key} style={{ fontWeight: pathname.includes(`/${tab.key}`) ? 600 : 500 }} className="flex h-12 shrink-0 items-center gap-2 px-4 text-sm sm:px-5"><Icon className="h-4 w-4 shrink-0" /><span>{tab.label}</span>{count > 0 && <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center px-1.5 text-[10px] font-bold">{count}</span>}</span>;
        })}</div></div>
        {canToggle && <button type="button" onClick={toggleLabels} aria-label={compactView ? 'Show tab labels' : 'Show icons only'} title={compactView ? 'Show tab labels' : 'Show icons only'} aria-expanded={!compactView} aria-controls={navId} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--text-primary)] hover:bg-[var(--bg-surface)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--institute-ink)]">
          {compactView ? <ChevronRight aria-hidden="true" className="h-4 w-4" /> : <ChevronLeft aria-hidden="true" className="h-4 w-4" />}
        </button>}
        <div className="min-w-0 flex-1 overflow-x-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <nav
          id={navId}
          className={`flex flex-nowrap items-center gap-0 ${compactView ? 'w-full' : 'min-w-max'}`}
          aria-label="Course tabs"
        >
          {TABS.filter(tab => !attendanceOnly || tab.key === 'attendance').map((tab) => {
            const href = `/${instituteCode}/courses/${courseId}/${tab.key}`;
            const isActive = pathname.includes(`/${tab.key}`);
            const Icon = tab.icon;

            return (
              <Link
                key={tab.key}
                href={href}
                ref={isActive ? activeTabRef : undefined}
                aria-current={isActive ? 'page' : undefined}
                title={compactView ? tab.label : undefined}
                className={`relative flex h-12 items-center justify-center gap-2 text-sm font-medium transition-colors whitespace-nowrap ${compactView ? 'min-w-0 flex-1 px-0' : 'shrink-0 px-4 sm:px-5'} ${
                  isActive
                    ? "font-semibold"
                    : "text-slate-600 dark:text-[#8B92A5] hover:text-slate-900 dark:hover:text-[#F0F2F8]"
                }`}
                style={{
                  color: isActive ? 'var(--institute-ink, var(--text-primary))' : undefined,
                }}
              >
                {isActive && <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px]" style={{ backgroundColor: theme.colors.primary }} />}
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className={compactView ? 'sr-only' : undefined}>{tab.label}</span>
                {tab.key === "people" && pendingCount > 0 && (
                  <span
                    className={`${compactView ? 'absolute right-0 top-0' : 'ml-1'} inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white shadow-xs`}
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    {pendingCount}
                  </span>
                )}
                {tab.key === "gradebook" && pendingWorkCount > 0 && (
                  <span
                    className={`${compactView ? 'absolute right-0 top-0' : 'ml-1'} inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white bg-rose-500 shadow-xs`}
                    title={`${pendingWorkCount} pending submissions to grade`}
                  >
                    {pendingWorkCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        </div>
      </div>
    </div>
  );
}
