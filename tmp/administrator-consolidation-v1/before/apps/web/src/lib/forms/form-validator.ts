import type { FormData, FormQuestionData } from "@/types/forms";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export function validateFormForPublish(form: FormData): ValidationResult {
  const errors: string[] = [];

  if (!form.title || form.title.trim().length === 0) {
    errors.push("Form must have a title.");
  }

  const questions = form.questions || [];
  const contentQuestions = questions.filter((q) => q.questionType !== "SECTION_HEADER");

  if (contentQuestions.length === 0) {
    errors.push("Form must contain at least one question.");
  }

  if (form.timeLimitMins !== null && form.timeLimitMins !== undefined && form.timeLimitMins < 1) {
    errors.push("Time limit must be at least 1 minute.");
  }

  if (form.opensAt && form.closesAt) {
    const openTime = new Date(form.opensAt).getTime();
    const closeTime = new Date(form.closesAt).getTime();
    if (closeTime <= openTime) {
      errors.push("Close date and time must be after open date and time.");
    }
  }

  contentQuestions.forEach((q, idx) => {
    const num = idx + 1;
    if (!q.prompt || q.prompt.trim().length === 0) {
      errors.push(`Question #${num} cannot have a blank title.`);
    }

    if (["MULTIPLE_CHOICE", "CHECKBOXES", "DROPDOWN", "IMAGE_CHOICE"].includes(q.questionType)) {
      const options = q.config?.options || [];
      if (options.length < 2) {
        errors.push(`Question #${num} (${(q.prompt || "").slice(0, 30)}...) must have at least 2 options.`);
      }
      const blankOptions = options.filter((opt) => !opt.text || opt.text.trim().length === 0);
      if (blankOptions.length > 0) {
        errors.push(`Question #${num} has ${blankOptions.length} blank option(s). All options must have text.`);
      }
    }

    if (q.questionType === "MATRIX") {
      const rows = q.config?.matrix?.rows || [];
      const cols = q.config?.matrix?.columns || [];
      if (rows.length === 0 || cols.length === 0) {
        errors.push(`Matrix question #${num} must have at least 1 row and 1 column.`);
      }
    }

    if (q.questionType === "RANKING") {
      const items = q.config?.ranking?.items || [];
      if (items.length < 2) {
        errors.push(`Ranking question #${num} must have at least 2 items to rank.`);
      }
    }
  });

  // Also validate section headers for non-blank titles
  const sectionHeaders = questions.filter((q) => q.questionType === "SECTION_HEADER");
  sectionHeaders.forEach((sec, idx) => {
    if (!sec.prompt || sec.prompt.trim().length === 0) {
      errors.push(`Section Header #${idx + 1} cannot have a blank title.`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}
