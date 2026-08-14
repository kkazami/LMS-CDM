export interface FlashcardDeck {
  id: string;
  title: string;
  description: string;
  tags: string[];
  color: string;
  courseId: string | null;
  courseTitle: string | null;
  creatorId: string;
  instituteId: string;
  isArchived: boolean;
  cardCount: number;
  correctCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardCard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  hint: string;
  attachments: FlashcardAttachment[];
  orderIndex: number;
  progress?: FlashcardCardProgress;
  createdAt: string;
  updatedAt: string;
}

export interface FlashcardAttachment {
  type: "image" | "code";
  url: string;
  label: string;
}

export type FlashcardStatus = "unseen" | "correct" | "incorrect";

export interface FlashcardCardProgress {
  status: FlashcardStatus;
  attemptCount: number;
  correctCount: number;
  lastAnswer: string;
  lastReviewedAt: string | null;
}

export interface FlashcardStudyStats {
  totalCards: number;
  correct: number;
  incorrect: number;
  unseen: number;
}
