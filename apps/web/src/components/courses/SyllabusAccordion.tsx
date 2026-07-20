"use client";

import { useState } from "react";
import Link from "next/link";
import type { InstituteTheme } from "@/lib/theme";
import Badge from "@/components/common/Badge";
import {
  ChevronDown,
  ChevronRight,
  FileText,
  HelpCircle,
  BookOpen,
  Calendar,
  Edit2,
  Trash2,
  GripVertical,
} from "lucide-react";

interface SyllabusItemData {
  id: string;
  type: string;
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

const getTypeConfig = (type: string) => {
  const configs: Record<string, { icon: any; label: string; color: string }> = {
    ASSIGNMENT: { icon: FileText, label: "Assignments", color: "#3B82F6" },
    QUIZ: { icon: HelpCircle, label: "Quizzes", color: "#8B5CF6" },
    MATERIAL: { icon: BookOpen, label: "Materials", color: "#10B981" },
    ACTIVITY: { icon: FileText, label: "Activities", color: "#F59E0B" },
    RECITATION: { icon: BookOpen, label: "Recitations", color: "#EC4899" },
    MIDTERM_EXAM: { icon: HelpCircle, label: "Midterm Exams", color: "#EF4444" },
    FINAL_EXAM: { icon: HelpCircle, label: "Final Exams", color: "#EF4444" },
  };

  if (configs[type]) return configs[type];

  // Custom types
  const label = type
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ") + "s";
    
  return { icon: FileText, label, color: "#6B7280" };
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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
    {}
  );

  const types = allTypes;

  return (
    <div className="space-y-3">
      {types.map((type) => {
        const config = getTypeConfig(type);
        const typeItems = grouped[type] || [];
        const isExpanded = expandedSections.has(type);
        const Icon = config.icon;

        // Skip rendering if it's a non-default type with no items
        if (typeItems.length === 0 && !["ASSIGNMENT", "QUIZ", "MATERIAL"].includes(type)) {
          return null;
        }

        return (
          <div
            key={type}
            className="overflow-hidden rounded-lg border border-gray-300 bg-white"
          >
            {/* Section Header */}
            <button
              onClick={() => toggleSection(type)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-400" />
              )}
              <Icon className="h-5 w-5" style={{ color: config.color }} />
              <span className="text-sm font-semibold text-gray-900">
                {config.label}
              </span>
              <span className="ml-auto rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                {typeItems.length}
              </span>
            </button>

            {/* Section Items */}
            {isExpanded && (
              <div className="border-t border-gray-200">
                {typeItems.length === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-gray-400">
                    No {config.label.toLowerCase()} yet.
                  </p>
                ) : (
                  typeItems.map((item, index) => (
                    <Link
                      href={`/${instituteCode}/courses/${courseId}/classwork/${item.id}`}
                      key={item.id}
                      className={`flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${
                        index < typeItems.length - 1
                          ? "border-b border-gray-50"
                          : ""
                      }`}
                    >
                      <div
                        className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-full"
                        style={{
                          backgroundColor: `${config.color}15`,
                          color: config.color,
                        }}
                      >
                        <Icon className="h-4 w-4" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {item.title}
                        </p>
                        {item.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          {item.dueDate && (
                            <span className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="h-3 w-3" />
                              Due {formatDate(item.dueDate)}
                            </span>
                          )}
                          {item.maxPoints !== null && item.maxPoints !== undefined && (
                            <span className="text-xs text-gray-400">
                              {item.maxPoints} pts
                            </span>
                          )}
                          {item.targetGroups.length > 0 && (
                            <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              {item.targetGroups.length === 1
                                ? item.targetGroups[0].group.groupName
                                : `${item.targetGroups.length} groups`}
                            </span>
                          )}
                        </div>
                      </div>

                      {canEdit && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <button
                            onClick={(e) => { e.preventDefault(); onEdit?.(item); }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
                            aria-label={`Edit ${item.title}`}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={(e) => { e.preventDefault(); onDelete?.(item.id); }}
                            className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                            aria-label={`Delete ${item.title}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
