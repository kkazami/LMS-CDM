export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  color: string;
  pinned: boolean;
  archived: boolean;
  orderIndex: number;
  creatorId: string;
  instituteId: string;
  createdAt: string;
  updatedAt: string;
}