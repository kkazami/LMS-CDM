"use client";

import MultipleChoiceInput from "./inputs/MultipleChoiceInput";
import CheckboxesInput from "./inputs/CheckboxesInput";
import ShortAnswerInput from "./inputs/ShortAnswerInput";
import ParagraphInput from "./inputs/ParagraphInput";
import DropdownInput from "./inputs/DropdownInput";
import LinearScaleInput from "./inputs/LinearScaleInput";
import StarRatingInput from "./inputs/StarRatingInput";
import DateTimeInput from "./inputs/DateTimeInput";
import FileUploadInput from "./inputs/FileUploadInput";
import MatrixInput from "./inputs/MatrixInput";
import RankingInput from "./inputs/RankingInput";
import ImageChoiceInput from "./inputs/ImageChoiceInput";
import CodeAnswerInput from "./inputs/CodeAnswerInput";
import SectionHeader from "./inputs/SectionHeader";
import type { FormQuestionData } from "@/types/forms";
import type { InstituteTheme } from "@/lib/theme";

interface QuestionRendererProps {
  question: FormQuestionData;
  index: number;
  value: {
    answerText?: string | null;
    answerOptions?: string[] | null;
    answerNumber?: number | null;
    answerDate?: string | Date | null;
    answerRanking?: string[] | null;
    answerMatrix?: Record<string, string> | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSizeBytes?: number | null;
  };
  onChange: (updates: {
    answerText?: string | null;
    answerOptions?: string[] | null;
    answerNumber?: number | null;
    answerDate?: string | Date | null;
    answerRanking?: string[] | null;
    answerMatrix?: Record<string, string> | null;
    fileUrl?: string | null;
    fileName?: string | null;
    fileSizeBytes?: number | null;
  }) => void;
  hasError?: boolean;
  disabled?: boolean;
  theme?: InstituteTheme;
}

export default function QuestionRenderer({
  question,
  index,
  value,
  onChange,
  hasError = false,
  disabled = false,
  theme,
}: QuestionRendererProps) {
  if (question.questionType === "SECTION_HEADER") {
    return <SectionHeader title={question.prompt} description={question.description} />;
  }

  const config = question.config || {};

  return (
    <div
      id={`question-${question.id}`}
      className={`rounded-2xl bg-white dark:bg-[#12151E] border p-5 sm:p-7 space-y-3 transition-all ${
        hasError
          ? "border-rose-500 ring-2 ring-rose-500/20"
          : "border-slate-200/90 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20 shadow-xs"
      }`}
    >
      {/* Question Prompt Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-snug">
            <span>{question.prompt}</span>
            {question.isRequired && <span className="text-rose-500 ml-1 font-extrabold">*</span>}
          </div>

          {question.description && (
            <p className="text-xs text-slate-500 dark:text-[#8B92A5] leading-relaxed">
              {question.description}
            </p>
          )}
        </div>

        {question.points > 0 && (
          <span className="shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-300">
            {question.points} {question.points === 1 ? "point" : "points"}
          </span>
        )}
      </div>

      {/* Media attachment if any */}
      {question.mediaUrl && (
        <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 my-2">
          {question.mediaType === "IMAGE" && (
            <img src={question.mediaUrl} alt={question.prompt} className="w-full max-h-72 object-cover" />
          )}
          {question.mediaType === "VIDEO" && (
            <video src={question.mediaUrl} controls className="w-full max-h-72" />
          )}
        </div>
      )}

      {/* Input Switch */}
      <div className="pt-1">
        {question.questionType === "MULTIPLE_CHOICE" && (
          <MultipleChoiceInput
            options={config.options || []}
            selectedId={value?.answerOptions?.[0]}
            onChange={(selectedId) => onChange({ answerOptions: [selectedId] })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "CHECKBOXES" && (
          <CheckboxesInput
            options={config.options || []}
            selectedIds={value?.answerOptions || []}
            onChange={(selectedIds) => onChange({ answerOptions: selectedIds })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "SHORT_ANSWER" && (
          <ShortAnswerInput
            value={value?.answerText}
            onChange={(text) => onChange({ answerText: text })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "PARAGRAPH" && (
          <ParagraphInput
            value={value?.answerText}
            onChange={(text) => onChange({ answerText: text })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "DROPDOWN" && (
          <DropdownInput
            options={config.options || []}
            selectedId={value?.answerOptions?.[0]}
            onChange={(selectedId) => onChange({ answerOptions: [selectedId] })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "IMAGE_CHOICE" && (
          <ImageChoiceInput
            options={config.options || []}
            selectedId={value?.answerOptions?.[0]}
            onChange={(selectedId) => onChange({ answerOptions: [selectedId] })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "LINEAR_SCALE" && (
          <LinearScaleInput
            config={config.linearScale}
            value={value?.answerNumber}
            onChange={(num) => onChange({ answerNumber: num })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "STAR_RATING" && (
          <StarRatingInput
            maxStars={config.starRating?.maxStars || 5}
            value={value?.answerNumber}
            onChange={(num) => onChange({ answerNumber: num })}
            disabled={disabled}
          />
        )}

        {question.questionType === "DATE" && (
          <DateTimeInput
            value={value?.answerDate}
            onChange={(dateStr) => onChange({ answerDate: dateStr })}
            disabled={disabled}
          />
        )}

        {question.questionType === "FILE_UPLOAD" && (
          <FileUploadInput
            config={config.fileUpload}
            fileUrl={value?.fileUrl}
            fileName={value?.fileName}
            fileSizeBytes={value?.fileSizeBytes}
            onChange={(fileData) =>
              onChange(
                fileData
                  ? {
                      fileUrl: fileData.fileUrl,
                      fileName: fileData.fileName,
                      fileSizeBytes: fileData.fileSizeBytes,
                    }
                  : { fileUrl: null, fileName: null, fileSizeBytes: null }
              )
            }
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "MATRIX" && (
          <MatrixInput
            config={config.matrix}
            value={value?.answerMatrix}
            onChange={(matrix) => onChange({ answerMatrix: matrix })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "RANKING" && (
          <RankingInput
            config={config.ranking}
            value={value?.answerRanking}
            onChange={(ranking) => onChange({ answerRanking: ranking })}
            disabled={disabled}
            theme={theme}
          />
        )}

        {question.questionType === "CODE_ANSWER" && (
          <CodeAnswerInput
            config={config.codeAnswer}
            value={value?.answerText}
            onChange={(code) => onChange({ answerText: code })}
            disabled={disabled}
          />
        )}
      </div>

      {hasError && (
        <p className="text-xs font-semibold text-rose-500 pt-1">
          This question is required.
        </p>
      )}
    </div>
  );
}
