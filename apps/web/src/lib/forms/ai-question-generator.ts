import type { FormQuestionData, QuestionType } from "@/types/forms";
import { callGemini, isGeminiAvailable } from "@/features/knowledge-exchange/ai/gemini-client";

interface GenerateParams {
  contentOrTopic: string;
  count?: number;
  questionTypes?: QuestionType[];
  difficulty?: "EASY" | "MEDIUM" | "HARD";
}

export async function generateQuestionsFromContent({
  contentOrTopic,
  count = 5,
  questionTypes = ["MULTIPLE_CHOICE", "CHECKBOXES", "SHORT_ANSWER"],
  difficulty = "MEDIUM",
}: GenerateParams): Promise<Omit<FormQuestionData, "id" | "formId" | "position">[]> {
  const systemInstruction = `You are an expert LMS exam and quiz curriculum designer. 
Generate educational questions based on the provided topic or content.
You MUST output valid, pure JSON without Markdown code blocks or wrapping. 
Output format:
[
  {
    "questionType": "MULTIPLE_CHOICE",
    "prompt": "What is ...?",
    "description": "Optional hint",
    "points": 1,
    "isRequired": true,
    "partialCredit": false,
    "config": {
      "options": [
        { "id": "opt_1", "text": "Option A", "isCorrect": true, "feedback": "Explanation why A is correct" },
        { "id": "opt_2", "text": "Option B", "isCorrect": false, "feedback": "Why B is incorrect" },
        { "id": "opt_3", "text": "Option C", "isCorrect": false, "feedback": "Why C is incorrect" },
        { "id": "opt_4", "text": "Option D", "isCorrect": false, "feedback": "Why D is incorrect" }
      ]
    }
  }
]
Supported question types to generate: ${questionTypes.join(", ")}.
Difficulty level: ${difficulty}.
Number of questions to produce: ${count}.`;

  const prompt = `Course Material / Topic:
${contentOrTopic}

Generate exactly ${count} assessment questions in the JSON format requested.`;

  if (isGeminiAvailable()) {
    try {
      const response = await callGemini(prompt, systemInstruction);
      if (response.success && response.text) {
        // Strip markdown backticks if present
        const cleaned = response.text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((item, i) => ({
            questionType: item.questionType || "MULTIPLE_CHOICE",
            prompt: item.prompt || `Question #${i + 1}`,
            description: item.description || null,
            mediaUrl: null,
            mediaType: null,
            isRequired: item.isRequired ?? true,
            points: item.points ?? 1,
            partialCredit: item.partialCredit ?? false,
            config: item.config || {},
            showIfQuestionId: null,
            showIfAnswer: null,
          }));
        }
      }
    } catch (err) {
      console.warn("[AI Question Generation Fallback]", err);
    }
  }

  // Fallback: Generate starter template questions if AI key is missing or failed
  const fallbackQuestions: Omit<FormQuestionData, "id" | "formId" | "position">[] = [];
  const baseCount = Math.min(count, 5);

  for (let i = 1; i <= baseCount; i++) {
    const qType: QuestionType = questionTypes[(i - 1) % questionTypes.length] || "MULTIPLE_CHOICE";

    if (qType === "MULTIPLE_CHOICE" || qType === "DROPDOWN") {
      fallbackQuestions.push({
        questionType: qType,
        prompt: `Key Concept #${i}: What is the primary role of ${contentOrTopic.slice(0, 30)}?`,
        description: "Select the best answer.",
        isRequired: true,
        points: 1,
        partialCredit: false,
        config: {
          options: [
            { id: `opt_${i}_1`, text: "Fundamental requirement A", isCorrect: true, feedback: "Correct definition" },
            { id: `opt_${i}_2`, text: "Secondary consideration B", isCorrect: false, feedback: "Incorrect" },
            { id: `opt_${i}_3`, text: "Unrelated aspect C", isCorrect: false, feedback: "Incorrect" },
            { id: `opt_${i}_4`, text: "None of the above", isCorrect: false, feedback: "Incorrect" },
          ],
        },
      });
    } else if (qType === "CHECKBOXES") {
      fallbackQuestions.push({
        questionType: "CHECKBOXES",
        prompt: `Select all characteristics that apply to ${contentOrTopic.slice(0, 30)}:`,
        isRequired: true,
        points: 2,
        partialCredit: true,
        config: {
          options: [
            { id: `chk_${i}_1`, text: "Criterion 1 (True)", isCorrect: true },
            { id: `chk_${i}_2`, text: "Criterion 2 (True)", isCorrect: true },
            { id: `chk_${i}_3`, text: "Common misconception (False)", isCorrect: false },
          ],
        },
      });
    } else {
      fallbackQuestions.push({
        questionType: "SHORT_ANSWER",
        prompt: `Explain the fundamental concept of ${contentOrTopic.slice(0, 30)} in brief:`,
        isRequired: true,
        points: 1,
        partialCredit: false,
        config: {
          shortAnswer: {
            correctAnswers: ["standard answer"],
            caseSensitive: false,
          },
        },
      });
    }
  }

  return fallbackQuestions;
}
