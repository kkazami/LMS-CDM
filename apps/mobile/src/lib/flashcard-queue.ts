import { useAuthStore } from '../stores/auth-store';
import { newOperationKey, readStudentDraft, writeStudentDraft } from './student-drafts';
import { studentScope, scopeIsCurrent } from './student-scope';
type Review = { cardId: string; selfRating: 'knew_it' | 'still_learning'; key: string };
type Completion = { deckId: string; cardsReviewed: number; durationSeconds: number; idempotencyKey: string };
type Queue = { reviews: Review[]; completions: Completion[] };
let operations: Promise<unknown> = Promise.resolve();
function serialized<T>(work: () => Promise<T>): Promise<T> {
  const next = operations.catch(() => {}).then(work);
  operations = next;
  return next;
}
export function queueCardReview(cardId: string, selfRating: Review['selfRating']) {
  const scope = studentScope();
  return serialized(async () => {
    if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed. Reopen your deck.');
    const queue = await readStudentDraft<Queue>('flashcard_queue') ?? { reviews: [], completions: [] };
    queue.reviews.push({ cardId, selfRating, key: newOperationKey() });
    await writeStudentDraft('flashcard_queue', queue);
  });
}
export function queueCardCompletion(completion: Completion) {
  const scope = studentScope();
  return serialized(async () => {
    if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed. Reopen your deck.');
    const queue = await readStudentDraft<Queue>('flashcard_queue') ?? { reviews: [], completions: [] };
    if (!queue.completions.some(value => value.idempotencyKey === completion.idempotencyKey)) queue.completions.push(completion);
    await writeStudentDraft('flashcard_queue', queue);
  });
}
export function syncCardQueue() {
  const scope = studentScope();
  return serialized(async () => {
    if (!scopeIsCurrent(scope)) return { expEarned: 0 };
    const queue = await readStudentDraft<Queue>('flashcard_queue') ?? { reviews: [], completions: [] };
    const api = useAuthStore.getState().api;
    if ((queue.reviews.length || queue.completions.length) && (useAuthStore.getState().mobileCapabilities?.studentReceipts ?? 0) < 1) {
      throw new Error('Update the web backend before syncing practice. Your reviews remain saved on this device.');
    }
    while (queue.reviews.length) {
      if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed.');
      const review = queue.reviews[0];
      await api.flashcards.recordProgress(review.cardId, review.selfRating, review.key);
      if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed.');
      queue.reviews.shift();
      await writeStudentDraft('flashcard_queue', queue);
    }
    let expEarned = 0;
    while (queue.completions.length) {
      if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed.');
      const completion = queue.completions[0];
      const result = await api.flashcards.completeSession(completion.deckId, completion);
      if (!scopeIsCurrent(scope)) throw new Error('Sign-in changed.');
      expEarned += result.expEarned;
      queue.completions.shift();
      await writeStudentDraft('flashcard_queue', queue);
    }
    return { expEarned };
  });
}
