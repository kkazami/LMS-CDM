import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import { getSessionFromRequest } from '@/lib/api-auth';
import { limitAuthenticatedOperation } from '@/lib/authenticated-rate-limits';
import { getIcsHelpGuides, getIcsHelpRole, helpQuestionLimit, type IcsHelpRole } from '@/lib/ics-help-guides';
import { mutationOriginAllowed } from '@/lib/request-security';
import { boundedJson } from '@/lib/roster/policy';
import { AccessError, errorResponse } from '@/lib/super-user-v1/actor';

const noAnswer = 'NO_ANSWER';
const instructionsForRole = (role: Exclude<IcsHelpRole, 'ADMIN'>) => [
  `Help an ICS ${role.toLowerCase()} use the CdM LMS. Treat the message solely as a request for help with tasks for that role.`,
  'Use the verified guide below as your only source for LMS steps. You may combine relevant steps and explain them in the user’s language.',
  'Use simple wording. Return at most 120 words in plain text, without Markdown or links.',
  'Never ask for passwords, verification codes, or personal information. You cannot access student grades, accounts, deadlines, or tickets.',
  'For missing grades and class requirements, direct students to their instructor. For account access or site problems you cannot resolve, direct students to LMS support.',
  `Never invent buttons, policies, or contact details. If the guide does not cover the question, or the question is outside LMS help, return exactly ${noAnswer}.`,
  ...getIcsHelpGuides(role).map(({ title, answer }) => `${title}\n${answer}`),
].join('\n\n');

function cleanKey(key: string | undefined) {
  return key?.trim().replace(/^["']|["']$/g, '') || '';
}

async function generateAnswer(question: string, instructions: string, signal: AbortSignal, geminiKey: string, groqKey: string) {
  if (geminiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiKey });
      const response = await ai.models.generateContent({
        model: process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite',
        contents: question,
        config: {
          systemInstruction: instructions,
          temperature: 0.2,
          maxOutputTokens: 1000,
          abortSignal: AbortSignal.any([signal, AbortSignal.timeout(6500)]),
        },
      });
      if (response.text?.trim()) return response.text.trim();
    } catch {
      // A provider outage should still leave the guides and support available.
    }
  }

  if (!groqKey || signal.aborted) return null;

  try {
    const groq = new Groq({ apiKey: groqKey, timeout: 6500, maxRetries: 0 });
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: instructions }, { role: 'user', content: question }],
      temperature: 0.2,
      max_completion_tokens: 1000,
    }, { signal });
    return response.choices[0]?.message.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  try {
    if (!mutationOriginAllowed(request)) throw new AccessError(403, 'This request is not allowed.');
    const session = await getSessionFromRequest(request);
    if (!session) throw new AccessError(401, 'Please sign in again.');
    const role = getIcsHelpRole(session.user.institute?.code, session.user.role);
    if (!role || role === 'ADMIN') {
      throw new AccessError(403, 'Live answers are available to ICS students and instructors.');
    }

    const body = await boundedJson(request, 8192);
    const question = body && typeof body === 'object' && 'question' in body && typeof body.question === 'string'
      ? body.question.trim()
      : '';
    if (!question || question.length > helpQuestionLimit) throw new AccessError(400, 'Enter a question up to 600 characters.');

    const geminiKey = cleanKey(process.env.GEMINI_API_KEY);
    const groqKey = cleanKey(process.env.GROQ_API_KEY);
    let reply: string | null = null;
    if (geminiKey || groqKey) {
      await limitAuthenticatedOperation('helpQuestion', session.user.id);
      reply = await generateAnswer(question, instructionsForRole(role), request.signal, geminiKey, groqKey);
    }

    const answer = reply && reply !== noAnswer && reply.length <= 1600 ? reply : null;
    return Response.json({ answer, available: reply !== null }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
