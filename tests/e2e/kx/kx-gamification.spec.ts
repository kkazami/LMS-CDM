import { test, expect } from '@playwright/test';
import { KX_EXP_VALUES } from '../../../apps/web/src/features/knowledge-exchange/constants';
import {
  KX_EXP_SOURCE,
  awardExpForUpvote,
} from '../../../apps/web/src/lib/gamification/kx-exp';

/**
 * Knowledge Exchange Gamification Integration & Anti-Farming Daily Caps
 * Mapped to: AC-025, AC-026
 */
test.describe('KX Gamification EXP & Caps (AC-025, AC-026)', () => {
  // ---------------------------------------------------------------------------
  // AC-025: EXP Awards for Q&A Actions
  // ---------------------------------------------------------------------------
  test('AC-025: EXP values match specification (+5 question, +10 answer, +15 accepted, +25 verified, +2 upvote)', () => {
    // 1. Asking question awards +5 EXP
    expect(KX_EXP_VALUES.ASK_QUESTION).toBe(5);

    // 2. Submitting answer awards +10 EXP
    expect(KX_EXP_VALUES.ANSWER_QUESTION).toBe(10);

    // 3. Answer acceptance awards +15 EXP
    expect(KX_EXP_VALUES.ACCEPTED_ANSWER).toBe(15);

    // 4. Instructor verification awards +25 EXP
    expect(KX_EXP_VALUES.VERIFIED_ANSWER).toBe(25);

    // 5. Receiving upvote awards +2 EXP
    expect(KX_EXP_VALUES.UPVOTE_RECEIVED).toBe(2);

    // Source identifier
    expect(KX_EXP_SOURCE).toBe('knowledge-exchange');
  });

  // ---------------------------------------------------------------------------
  // AC-026: Anti-Farming Daily Cap & Self-Voting Prevention
  // ---------------------------------------------------------------------------
  test('AC-026: Anti-farming daily upvote EXP cap is configured to 20 EXP/day', () => {
    expect(KX_EXP_VALUES.DAILY_UPVOTE_EXP_CAP).toBe(20);
  });

  test('AC-026: Self-voting returns null and prevents EXP grant', async () => {
    const authorId = 'same-user-id';
    const voterId = 'same-user-id';
    const targetId = 'target-post-1';

    // awardExpForUpvote strictly blocks self-voting
    const result = await awardExpForUpvote(authorId, voterId, targetId);
    expect(result).toBeNull();
  });
});
