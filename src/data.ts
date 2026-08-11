import { competitions } from './competitions';

export type { Competition } from './competitions';

export type Student = {
  id: string; // Internal unique ID
  uniqueCode: string;
  totalPoints: number;
  examPoints: number;
  achievementPoints: number;
  subjects: number[];
  priority: number;
  hasOriginal: boolean;
  hasContract?: boolean;
  semesterPayment?: string;
  status: string;
  mainHigherPriority: string;
  higherPassingPriority: string;
  preemptiveRight1: string;
  preemptiveRight2: string;
  idAtEquality: string;
  withoutExams: string;
  basisBVI: string;
};

export { competitions };
