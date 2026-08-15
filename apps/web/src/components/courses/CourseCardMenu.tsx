"use client";

import { useRef, useState, useEffect } from "react";
import { MoreVertical, LogOut, Archive, ArchiveRestore, Image as ImageIcon, Edit2 } from "lucide-react";

interface CourseCardMenuProps {
  courseId: string;
  isStudent: boolean;
  isArchived: boolean;
  onUnenroll?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  onCustomizeCard?: () => void;
  onEdit?: () => void;
}

export default function CourseCardMenu({
  courseId,
  isStudent,
  isArchived,
  onUnenroll,
  onArchive,
  onUnarchive,
  onCustomizeCard,
  onEdit,
}: CourseCardMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const stopEvent = (e: React.SyntheticEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  return (
    <div
      ref={menuRef}
      className="relative z-20 shrink-0"
      onClick={stopEvent}
      onMouseDown={stopEvent}
      onPointerDown={stopEvent}
    >
      <button
        type="button"
        onClick={(e) => {
          stopEvent(e);
          setOpen((prev) => !prev);
        }}
        onMouseDown={stopEvent}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-black/20 text-white hover:bg-black/40 transition-colors shadow-xs backdrop-blur-xs"
        aria-label="Course options"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1.5 w-44 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#22263A] shadow-xl py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100 text-slate-700 dark:text-[#F0F2F8]">
            {isStudent ? (
            <button
              type="button"
              onClick={(e) => {
                stopEvent(e);
                setOpen(false);
                onUnenroll?.();
              }}
              onMouseDown={stopEvent}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              Unenroll
            </button>
          ) : (
            <>
              {onEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    stopEvent(e);
                    setOpen(false);
                    onEdit();
                  }}
                  onMouseDown={stopEvent}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Edit2 className="h-4 w-4 text-blue-500" />
                  Edit
                </button>
              )}
              {onCustomizeCard && (
                <button
                  type="button"
                  onClick={(e) => {
                    stopEvent(e);
                    setOpen(false);
                    onCustomizeCard();
                  }}
                  onMouseDown={stopEvent}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ImageIcon className="h-4 w-4 text-blue-500" />
                  Customize Card
                </button>
              )}
              {isArchived ? (
                <button
                  type="button"
                  onClick={(e) => {
                    stopEvent(e);
                    setOpen(false);
                    onUnarchive?.();
                  }}
                  onMouseDown={stopEvent}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <ArchiveRestore className="h-4 w-4 text-indigo-500" />
                  Unarchive
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    stopEvent(e);
                    setOpen(false);
                    onArchive?.();
                  }}
                  onMouseDown={stopEvent}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-[#F0F2F8] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <Archive className="h-4 w-4 text-slate-400 dark:text-[#8B92A5]" />
                  Archive
                </button>
              )}
            </>
          )}
          </div>
        </>
      )}
    </div>
  );
}
