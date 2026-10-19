import type { FormQuestionData } from "@/types/forms";

export type AnswersMap = Record<
  string,
  {
    answerText?: string | null;
    answerOptions?: string[] | null;
    answerNumber?: number | null;
    answerDate?: string | Date | null;
    answerRanking?: string[] | null;
    answerMatrix?: Record<string, string> | null;
    fileUrl?: string | null;
  }
>;

export function evaluateQuestionVisibility(
  questions: FormQuestionData[],
  answers: AnswersMap
): Array<FormQuestionData & { isVisible: boolean }> {
  // First pass: map of question IDs to their evaluated visibility
  const visibilityMap = new Map<string, boolean>();

  return questions.map((q) => {
    // If no branching rule, always visible
    if (!q.showIfQuestionId || !q.showIfAnswer) {
      visibilityMap.set(q.id, true);
      return { ...q, isVisible: true };
    }

    // Check parent question visibility
    const isParentVisible = visibilityMap.get(q.showIfQuestionId) ?? true;
    if (!isParentVisible) {
      visibilityMap.set(q.id, false);
      return { ...q, isVisible: false };
    }

    const parentAnswer = answers[q.showIfQuestionId];
    if (!parentAnswer) {
      visibilityMap.set(q.id, false);
      return { ...q, isVisible: false };
    }

    let isMatch = false;
    const target = q.showIfAnswer.trim();

    if (parentAnswer.answerOptions && parentAnswer.answerOptions.length > 0) {
      isMatch = parentAnswer.answerOptions.includes(target);
    } else if (parentAnswer.answerText) {
      isMatch = parentAnswer.answerText.trim().toLowerCase() === target.toLowerCase();
    } else if (parentAnswer.answerNumber !== null && parentAnswer.answerNumber !== undefined) {
      isMatch = String(parentAnswer.answerNumber) === target;
    }

    visibilityMap.set(q.id, isMatch);
    return { ...q, isVisible: isMatch };
  });
}
