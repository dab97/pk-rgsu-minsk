import { Competition, Student } from '../data';

export type { Competition, Student };

export type BasisType = 'Бюджет' | 'Платное';
export type ViewType = 'competitions' | 'distribution' | 'my-position';

export type SortConfig = {
  key: keyof Student | null;
  direction: 'asc' | 'desc';
};

export type CompetitionStudentState = 'loading' | 'absent' | 'found';

export type DirectionRow = {
  comp: Competition;
  state: CompetitionStudentState;
  rank?: number;
  total?: number;
  points?: number;
  hasOriginal?: boolean;
  isCurrent?: boolean;
  priority?: number;
  passingScore?: number | null;
};

export type DashboardStats = {
  totalApps: number;
  originalsCount: number;
  competitionRatio: string;
  predictedPassing: number | null;
};

export type DistributionRow = {
  comp: Competition;
  loaded: boolean;
  cells: number[];
  total: number;
  passingIdx: number;
  passingScore: number | null;
};

export type DistributionBucket = {
  label: string;
  low: number;
  high: number;
};
