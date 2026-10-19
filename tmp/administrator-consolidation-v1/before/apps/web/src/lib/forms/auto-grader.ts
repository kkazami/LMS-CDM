import type { GradeResult, QuestionConfig, QuestionType } from "@/types/forms";

interface AnswerInput {
  questionType: QuestionType;
  points: number;
  partialCredit: boolean;
  config: QuestionConfig;
  answerText?: string | null;
  answerOptions?: string[] | null;
  answerNumber?: number | null;
  answerDate?: string | Date | null;
  answerRanking?: string[] | null;
  answerMatrix?: Record<string, string> | null;
  fileUrl?: string | null;
}

export function gradeAnswer(input: AnswerInput): GradeResult {
  const { questionType, points, partialCredit, config } = input;

  switch (questionType) {
    case "MULTIPLE_CHOICE":
    case "DROPDOWN":
    case "IMAGE_CHOICE": {
      const options = config.options || [];
      const chosenId = input.answerOptions?.[0];
      if (!chosenId) {
        return { earned: 0, isCorrect: false, feedback: null };
      }

      const correctOption = options.find((opt) => opt.isCorrect);
      const chosenOption = options.find((opt) => opt.id === chosenId);
      const isCorrect = correctOption ? correctOption.id === chosenId : false;
      const feedback = chosenOption?.feedback || (isCorrect ? correctOption?.feedback : null) || null;

      return {
        earned: isCorrect ? points : 0,
        isCorrect,
        feedback,
      };
    }

    case "CHECKBOXES": {
      const options = config.options || [];
      const correctIds = options.filter((opt) => opt.isCorrect).map((opt) => opt.id);
      const chosenIds = input.answerOptions || [];

      if (correctIds.length === 0) {
        // No answer key configured
        return { earned: chosenIds.length > 0 ? points : 0, isCorrect: true, feedback: null };
      }

      const allCorrectSelected = correctIds.every((id) => chosenIds.includes(id));
      const noWrongSelected = chosenIds.every((id) => correctIds.includes(id));
      const isFullyCorrect = allCorrectSelected && noWrongSelected;

      if (isFullyCorrect) {
        return { earned: points, isCorrect: true, feedback: null };
      }

      if (partialCredit) {
        const perOptionWeight = points / correctIds.length;
        const correctChosenCount = chosenIds.filter((id) => correctIds.includes(id)).length;
        const wrongChosenCount = chosenIds.filter((id) => !correctIds.includes(id)).length;
        const earned = Math.max(0, (correctChosenCount - wrongChosenCount) * perOptionWeight);
        return {
          earned: Math.round(earned * 100) / 100,
          isCorrect: earned > 0,
          feedback: null,
        };
      }

      return { earned: 0, isCorrect: false, feedback: null };
    }

    case "SHORT_ANSWER": {
      const text = (input.answerText || "").trim();
      const cfg = config.shortAnswer || {};
      const correctAnswers = cfg.correctAnswers || [];

      if (correctAnswers.length === 0) {
        return { earned: text.length > 0 ? points : 0, isCorrect: text.length > 0, feedback: null };
      }

      const isCorrect = correctAnswers.some((ans) => {
        const target = ans.trim();
        return cfg.caseSensitive ? target === text : target.toLowerCase() === text.toLowerCase();
      });

      return {
        earned: isCorrect ? points : 0,
        isCorrect,
        feedback: null,
      };
    }

    case "LINEAR_SCALE":
    case "STAR_RATING": {
      const hasNumber = input.answerNumber !== null && input.answerNumber !== undefined;
      return {
        earned: hasNumber ? points : 0,
        isCorrect: hasNumber,
        feedback: null,
      };
    }

    case "DATE": {
      const hasDate = Boolean(input.answerDate);
      return {
        earned: hasDate ? points : 0,
        isCorrect: hasDate,
        feedback: null,
      };
    }

    case "MATRIX": {
      const matrix = input.answerMatrix;
      const rows = config.matrix?.rows || [];
      const hasAnswer = matrix && Object.keys(matrix).length > 0;
      const allRowsAnswered = rows.length > 0 ? rows.every((r) => Boolean(matrix?.[r])) : Boolean(hasAnswer);

      return {
        earned: allRowsAnswered ? points : 0,
        isCorrect: allRowsAnswered,
        feedback: null,
      };
    }

    case "RANKING": {
      const ranking = input.answerRanking || [];
      const items = config.ranking?.items || [];
      const isComplete = ranking.length >= items.length && items.length > 0;

      return {
        earned: isComplete ? points : 0,
        isCorrect: isComplete,
        feedback: null,
      };
    }

    case "PARAGRAPH":
    case "CODE_ANSWER":
    case "FILE_UPLOAD": {
      // Open-ended questions: default to 0 points until instructor grades
      const hasSubmission =
        (input.answerText && input.answerText.trim().length > 0) || Boolean(input.fileUrl);

      return {
        earned: 0,
        isCorrect: null, // Null indicates pending manual review
        feedback: hasSubmission ? "Pending instructor review" : "Unanswered",
      };
    }

    case "SECTION_HEADER":
    default:
      return { earned: 0, isCorrect: null, feedback: null };
  }
}
