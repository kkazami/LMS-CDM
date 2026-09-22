/**
 * apps/web/src/features/knowledge-exchange/ai/gemini-client.ts
 *
 * Google Gemini API integration with graceful degradation.
 * Ensures zero crashes if the key is missing, invalid, or rate-limited.
 */

export interface GeminiResponse {
  text: string;
  success: boolean;
  error?: string;
  isUnavailable?: boolean;
}

export function isGeminiAvailable(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(key && key.trim().length > 0);
}

/**
 * Executes a text generation prompt against the Gemini 1.5 Flash model.
 * Gracefully catches network failures, rate limits, and missing API keys.
 */
export async function callGemini(
  prompt: string,
  systemInstruction?: string
): Promise<GeminiResponse> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return {
      text: "",
      success: false,
      error: "AI features temporarily unavailable (GEMINI_API_KEY not configured)",
      isUnavailable: true,
    };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const contents = [
      ...(systemInstruction
        ? [
            {
              role: "user",
              parts: [{ text: `System Instruction: ${systemInstruction}` }],
            },
          ]
        : []),
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ];

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2048,
        },
      }),
      // 10s timeout to prevent hanging
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.warn(`Gemini API call failed with status ${response.status}:`, errorBody);

      if (response.status === 429) {
        return {
          text: "",
          success: false,
          error: "AI quota exceeded. Please try again in a few moments.",
          isUnavailable: true,
        };
      }

      return {
        text: "",
        success: false,
        error: `AI service unavailable (HTTP ${response.status})`,
        isUnavailable: true,
      };
    }

    const data = await response.json();
    const candidateText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!candidateText) {
      return {
        text: "",
        success: false,
        error: "AI returned empty response.",
      };
    }

    return {
      text: candidateText,
      success: true,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("Gemini execution error caught:", message);

    return {
      text: "",
      success: false,
      error: "AI service temporarily unavailable.",
      isUnavailable: true,
    };
  }
}
