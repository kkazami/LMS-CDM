"use client";

import { useRef, useState, useEffect } from "react";
import { MoreVertical, LogOut, Archive, ArchiveRestore } from "lucide-react";

interface CourseCardMenuProps {
  courseId: string;
  isStudent: boolean;
  isArchived: boolean;
  onUnenroll?: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
}

export default function CourseCardMenu({
  courseId,
  isStudent,
  isArchived,
  onUnenroll,
  onArchive,
  onUnarchive,
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

  return (
    <div ref={menuRef} className="relative z-10">
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 transition-colors"
        aria-label="Course options"
      >
        <MoreVertical className="h-4 w-4 text-white" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-gray-200 bg-white shadow-xl py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100">
          {isStudent ? (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setOpen(false);
                onUnenroll?.();
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Unenroll
            </button>
          ) : (
            isArchived ? (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  onUnarchive?.();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ArchiveRestore className="h-4 w-4 text-indigo-500" />
                Unarchive
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  onArchive?.();
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Archive className="h-4 w-4 text-gray-400" />
                Archive
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}
