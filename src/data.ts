import { competitions } from './competitions';

export type Competition = {
  id: string;
  title: string;
  subtitle: string;
  branch: string;
  studyForm: string;
  educationLevel: string;
  basis: string;
  seats: number;
  url: string;
};

export type Student = {
  id: string; // Internal unique ID
  uniqueCode: string;
  totalPoints: number;
  examPoints: number;
  achievementPoints: number;
  subjects: number[];
  priority: number;
  hasOriginal: boolean;
  status: 'в конкурсе' | 'зачислен' | 'отказ' | '';
  mainHigherPriority: string;
  higherPassingPriority: string;
  preemptiveRight1: string;
  preemptiveRight2: string;
  idAtEquality: string;
  withoutExams: string;
  basisBVI: string;
};

export { competitions };
export type { CompetitionSource } from './competitions';
