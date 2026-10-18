"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

const ConvertFlashcardsModal = dynamic(
  () => import("@/components/courses/ConvertFlashcardsModal"),
  { ssr: false }
);
interface ConvertFlashcardsButtonProps {
  attachmentId: string;
  attachmentName: string;
  attachmentUrl?: string;
  courseId: string;
  instituteCode: string;
}

/** Check if a file extension supports flashcard conversion */
function isConvertibleFile(fileName: string): boolean {
  const ext = fileName.toLowerCase();
  return (
    ext.endsWith(".pdf") ||
    ext.endsWith(".pptx") ||
    ext.endsWith(".docx") ||
    ext.endsWith(".txt")
  );
}

export default function ConvertFlashcardsButton({
  attachmentId,
  attachmentName,
  attachmentUrl,
  courseId,
  instituteCode,
}: ConvertFlashcardsButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Only render for supported file types
  if (!isConvertibleFile(attachmentName)) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer"
      >
        <Sparkles className="h-4 w-4" />
        Convert to Flashcards
      </button>

      {showModal && (
        <ConvertFlashcardsModal
          attachmentId={attachmentId}
          attachmentName={attachmentName}
          attachmentUrl={attachmentUrl}
          courseId={courseId}
          instituteCode={instituteCode}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

