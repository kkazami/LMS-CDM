export type SystemClassworkType = 
  | 'ASSIGNMENT' 
  | 'QUIZ' 
  | 'MATERIAL' 
  | 'ACTIVITY' 
  | 'RECITATION' 
  | 'MIDTERM_EXAM' 
  | 'FINAL_EXAM' 
  | string; 

export interface CategoryWeight {
  id?: string;
  gradingPolicyId?: string;
  category: SystemClassworkType;
  weightPercentage: number;
}

export interface GradingPolicy {
  id?: string;
  courseId: string;
  weights: CategoryWeight[];
}
