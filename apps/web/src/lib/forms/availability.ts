import type { Prisma } from '@prisma/client';
import type { QuestionConfig } from '@/types/forms';

type Availability = { status: string; opensAt?: Date | string | null; closesAt?: Date | string | null };

export function formIsVisible(form: Availability, now = new Date()) {
  return ['PUBLISHED', 'CLOSED'].includes(form.status) && (!form.opensAt || new Date(form.opensAt) <= now);
}

export function formIsOpen(form: Availability, now = new Date()) {
  return formIsVisible(form, now) && form.status === 'PUBLISHED' && (!form.closesAt || now < new Date(form.closesAt));
}

export function visibleForms(now = new Date()): Prisma.FormWhereInput {
  return { status: { in: ['PUBLISHED', 'CLOSED'] }, OR: [{ opensAt: null }, { opensAt: { lte: now } }] };
}


export function studentQuestionConfig(raw: string | QuestionConfig): QuestionConfig {
  let config: QuestionConfig;
  try { config = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { config = {}; }
  if (!config || typeof config !== 'object' || Array.isArray(config)) config = {};
  const { shortAnswer: _shortAnswer, codeAnswer, options, ...rest } = config;
  return {
    ...rest,
    ...(Array.isArray(options) ? { options: options.map(({ isCorrect: _correct, feedback: _feedback, ...option }) => option) } : {}),
    ...(codeAnswer ? { codeAnswer: { language: codeAnswer.language, starterCode: codeAnswer.starterCode } } : {}),
  };
}

export function publicForm<T extends { passwordHash: string | null }>(form: T) {
  const { passwordHash, ...safe } = form;
  return { ...safe, hasPassword: Boolean(passwordHash) };
}

export function formDeadline(form: Pick<Availability, 'closesAt'> & { timeLimitMins: number | null }, now = new Date()) {
  const times = [form.timeLimitMins ? now.getTime() + form.timeLimitMins * 60000 : null, form.closesAt ? new Date(form.closesAt).getTime() : null].filter((time): time is number => time !== null);
  return times.length ? new Date(Math.min(...times)) : null;
}

export function localDateTimeValue(value?: Date | string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}
