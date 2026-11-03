"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import { getClassworkAppearance } from './classwork-appearance';
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Edit2,
  Trash2,
  FlaskConical,
  Clock,
} from "lucide-react";

interface SyllabusItemData {
  id: string;
  labAssignmentId?: string | null;
  labStartsAt?: string | null;
  formId?: string | null;
  formStartsAt?: string | null;
  type: string;
  isProgramming?: boolean;
  requireGithubRepo?: boolean;
  title: string;
  description: string;
  dueDate: string | null;
  maxPoints: number | null;
  targetGroups: { groupId: string; group: { groupName: string } }[];
}

interface SyllabusAccordionProps {
  items: SyllabusItemData[];
  theme: InstituteTheme;
  canEdit: boolean;
  instituteCode: string;
  courseId: string;
  onEdit?: (item: SyllabusItemData) => void;
  onDelete?: (itemId: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const dateFormatted = d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timeFormatted = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${dateFormatted} · ${timeFormatted}`;
}

export default function SyllabusAccordion({
  items,
  theme,
  canEdit,
  instituteCode,
  courseId,
  onEdit,
  onDelete,
}: SyllabusAccordionProps) {
  const isIte = (instituteCode || theme?.code || "").toLowerCase() === "ite";
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const future = items.map(item => item.labStartsAt ?? item.formStartsAt).filter((date): date is string => Boolean(date)).map(date => new Date(date).getTime()).filter(time => time > now);
    if (!future.length) return;
    const update = () => setNow(Date.now());
    const timer = setTimeout(update, Math.min(60000, Math.max(100, Math.min(...future) - now + 100)));
    window.addEventListener('focus', update);
    return () => { clearTimeout(timer); window.removeEventListener('focus', update); };
  }, [items, now]);
  // Collect all unique types from items
  const itemTypes = Array.from(new Set(items.map((i) => i.type || "MATERIAL")));
  const baseTypes = ["ASSIGNMENT", "QUIZ", "MATERIAL"];
  const allTypes = Array.from(new Set([...baseTypes, ...itemTypes]));

  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(allTypes)
  );

  const toggleSection = (type: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const grouped = items.reduce<Record<string, SyllabusItemData[]>>(
    (acc, item) => {
      const key = item.type || "MATERIAL";
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    Object.create(null) as Record<string, SyllabusItemData[]>
  );

  const types = allTypes;

  return (
    <div className="space-y-3">
      {types.map((type) => {
        const config = getClassworkAppearance(type);
        const typeItems = grouped[type] || [];
        const isExpanded = expandedSections.has(type);
        const Icon = config.icon;

        // Skip rendering if there are no items for this type
        if (typeItems.length === 0) {
          return null;
        }

        return (
          <div
            key={type}
            className="overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/5 bg-white dark:bg-[#141721] shadow-xs"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(type)}
              className="flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/3 cursor-pointer"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              )}
              <Icon className="h-5 w-5 shrink-0" style={{ color: config.color }} aria-hidden="true"/>
              <span className="text-sm font-bold text-slate-900 dark:text-[#F0F2F8]">
                {config.pluralLabel}
              </span>
              <span className="ml-auto rounded-full bg-slate-100 dark:bg-white/5 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:text-[#8B92A5]">
                {typeItems.length}
              </span>
            </button>

            {/* Section Items */}
            {isExpanded && (
              <div className="border-t border-slate-100 dark:border-white/5 divide-y divide-slate-100 dark:divide-white/5">
                {typeItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                    No {config.label.toLowerCase()} yet.
                  </p>
                ) : (
                  typeItems.map((item, index) => {
                    const startsAt = item.labStartsAt ?? item.formStartsAt;
                    const upcoming = Boolean(startsAt && new Date(startsAt).getTime() > now);
                    const locked = !canEdit && upcoming;
                    const appearance = getClassworkAppearance(item.type, Boolean(item.labAssignmentId));
                    const ItemIcon = appearance.icon;
                    return (
                    <Link
                      href={item.formId ? `/${instituteCode}/courses/${courseId}/classwork/forms/${item.formId}` : `/${instituteCode}/courses/${courseId}/classwork/${item.id}`}
                      title={locked ? 'View the opening schedule' : undefined}
                      prefetch={locked ? false : undefined}
                      key={item.id}
                      className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/2 group"
                      style={{
                        animation: `staggerFadeIn 0.2s ease-out both`,
                        animationDelay: `${Math.min(index, 10) * 40}ms`,
                      }}
                    >
                      <div
                        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl"
                        style={{
                          backgroundColor: `${appearance.color}15`,
                          color: appearance.color,
                        }}
                      >
                        <ItemIcon className="h-4 w-4" aria-hidden="true"/>
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold text-slate-900 dark:text-[#F0F2F8] transition-colors ${
                          isIte ? "group-hover:text-blue-600 dark:group-hover:text-blue-400" : "group-hover:text-[#F97316]"
                        }`}>
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8B92A5] line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {item.labAssignmentId && <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Guided practical lab</span>}
                          {item.isProgramming && <span className="text-xs font-medium text-slate-600 dark:text-[#8B92A5]">{item.requireGithubRepo ? 'Programming · GitHub required' : 'Programming'}</span>}
                          {upcoming && <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-200">Not started yet</span>}
                          {startsAt && <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-[#8B92A5]"><Clock className="h-3 w-3"/>{upcoming ? 'Opens' : 'Start'} {formatDate(startsAt)}</span>}
                          {item.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-slate-400 dark:text-[#8B92A5]">
                              <Calendar className="h-3 w-3" />
                              Due {formatDate(item.dueDate)}
                            </span>
                          )}
                          {item.maxPoints !== null && item.maxPoints !== undefined && (
                            <span className="text-xs text-slate-400 dark:text-[#8B92A5]">
                              {item.maxPoints} pts
                            </span>
                          )}
                          {item.targetGroups.length > 0 && (
                            <span className="inline-flex items-center rounded-md bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
                              {item.targetGroups.length === 1
                                ? item.targetGroups[0].group.groupName
                                : `${item.targetGroups.length} groups`}
                            </span>
                          )}
                        </div>
                      </div>

                      {canEdit && !item.labAssignmentId && (
                        <div className="flex shrink-0 items-center gap-1">
                          {instituteCode.toLowerCase() === 'ics' && item.type !== 'MATERIAL' && !item.formId && <button type="button" onClick={e => { e.preventDefault(); window.location.assign(`/ics/courses/${courseId}/labs?itemId=${encodeURIComponent(item.id)}`); }} aria-label={`Link practical lab to ${item.title}`} title="Link practical lab" className="rounded-lg p-2 text-orange-600 hover:bg-orange-50"><FlaskConical className="h-4 w-4" /></button>}
                          <button
                            onClick={(e) => { e.preventDefault(); if (item.formId) window.location.assign(`/${instituteCode}/courses/${courseId}/classwork/forms/${item.formId}/builder`); else onEdit?.(item); }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-[#F0F2F8] transition cursor-pointer min-h-9 min-w-9 flex items-center justify-center active:scale-95"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); onDelete?.(item.id); }}
                            className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400 transition cursor-pointer min-h-9 min-w-9 flex items-center justify-center active:scale-95"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </Link>
                  ); })
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
