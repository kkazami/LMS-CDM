"use client";

import {
  CheckSquare,
  CircleDot,
  FileText,
  AlignLeft,
  ChevronDownSquare,
  SlidersHorizontal,
  Star,
  Calendar,
  UploadCloud,
  Grid,
  ListOrdered,
  Image,
  Code2,
  Heading,
} from "lucide-react";
import type { QuestionType } from "@/types/forms";

export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  description: string;
  icon: typeof CircleDot;
  category: "CHOICE" | "TEXT" | "RATING" | "ADVANCED" | "LAYOUT";
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  {
    type: "MULTIPLE_CHOICE",
    label: "Multiple choice",
    description: "Pick one from a list of options",
    icon: CircleDot,
    category: "CHOICE",
  },
  {
    type: "CHECKBOXES",
    label: "Checkboxes",
    description: "Pick one or many choices",
    icon: CheckSquare,
    category: "CHOICE",
  },
  {
    type: "DROPDOWN",
    label: "Dropdown",
    description: "Select one option from a dropdown menu",
    icon: ChevronDownSquare,
    category: "CHOICE",
  },
  {
    type: "IMAGE_CHOICE",
    label: "Image choice",
    description: "Pick from image cards",
    icon: Image,
    category: "CHOICE",
  },
  {
    type: "SHORT_ANSWER",
    label: "Short answer",
    description: "Single-line text response",
    icon: FileText,
    category: "TEXT",
  },
  {
    type: "PARAGRAPH",
    label: "Paragraph",
    description: "Multi-line rich text response",
    icon: AlignLeft,
    category: "TEXT",
  },
  {
    type: "CODE_ANSWER",
    label: "Code answer",
    description: "Syntax-highlighted code editor response",
    icon: Code2,
    category: "TEXT",
  },
  {
    type: "LINEAR_SCALE",
    label: "Linear scale",
    description: "Rate 1–5 or 1–10 on a scale",
    icon: SlidersHorizontal,
    category: "RATING",
  },
  {
    type: "STAR_RATING",
    label: "Star rating",
    description: "Visual 1–5 stars rating",
    icon: Star,
    category: "RATING",
  },
  {
    type: "MATRIX",
    label: "Matrix / grid",
    description: "Rate multiple rows against columns",
    icon: Grid,
    category: "ADVANCED",
  },
  {
    type: "RANKING",
    label: "Ranking",
    description: "Drag to reorder items by priority",
    icon: ListOrdered,
    category: "ADVANCED",
  },
  {
    type: "DATE",
    label: "Date / time",
    description: "Date and time picker response",
    icon: Calendar,
    category: "ADVANCED",
  },
  {
    type: "FILE_UPLOAD",
    label: "File upload",
    description: "Allow students to upload documents or files",
    icon: UploadCloud,
    category: "ADVANCED",
  },
  {
    type: "SECTION_HEADER",
    label: "Section header",
    description: "Non-question descriptive banner or heading",
    icon: Heading,
    category: "LAYOUT",
  },
];

interface QuestionTypeMenuProps {
  value: QuestionType;
  onChange: (type: QuestionType) => void;
  className?: string;
}

export default function QuestionTypeMenu({ value, onChange, className = "" }: QuestionTypeMenuProps) {
  const current = QUESTION_TYPES.find((t) => t.type === value) || QUESTION_TYPES[0];
  const CurrentIcon = current.icon;

  return (
    <div className={`relative inline-block ${className}`}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as QuestionType)}
        className="appearance-none pl-9 pr-8 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 text-slate-800 dark:text-white cursor-pointer hover:bg-slate-200/60 dark:hover:bg-white/10 transition-colors focus:outline-hidden focus:ring-2 focus:ring-primary/40"
      >
        {QUESTION_TYPES.map((t) => (
          <option key={t.type} value={t.type} className="bg-white dark:bg-[#1A1E2B] text-slate-900 dark:text-white py-1">
            {t.label}
          </option>
        ))}
      </select>
      <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 dark:text-slate-400">
        <CurrentIcon className="w-4 h-4" />
      </div>
    </div>
  );
}
