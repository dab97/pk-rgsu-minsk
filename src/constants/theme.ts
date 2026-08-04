import { BasisType } from '../types';

export type AccentTheme = {
  text: string;
  textStrong: string;
  textMuted: string;
  card: string;
  cardBorder: string;
  blob: string;
  badge: string;
  rowBg: string;
  rowBorder: string;
  successBadge: string;
  sidebarActive: string;
  banner: string;
  spinner: string;
  linkText: string;
  sortIcon: string;
  meBorder: string;
  copyHover: string;
  rowHover: string;
  checkbox: string;
  pillBg: string;
};

export const accentThemes: Record<BasisType, AccentTheme> = {
  'Бюджет': {
    text: "text-teal-600 dark:text-teal-400",
    textStrong: "text-teal-800 dark:text-teal-300",
    textMuted: "text-teal-600/80 dark:text-teal-400/80",
    card: "bg-teal-50 dark:bg-teal-950/20 border-teal-100 dark:border-teal-900",
    cardBorder: "border-teal-200 dark:border-teal-900",
    blob: "bg-teal-500/10",
    badge: "bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300 border-teal-100 dark:border-teal-900",
    rowBg: "bg-emerald-50/40 dark:bg-emerald-900/10",
    rowBorder: "border-b-emerald-500 dark:border-b-emerald-500",
    successBadge: "dark:bg-emerald-600",
    sidebarActive: "bg-teal-50 border-teal-200 dark:bg-teal-900/20 dark:border-teal-800/50",
    banner: "border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-900/20 text-teal-800 dark:text-teal-200",
    spinner: "text-teal-600",
    linkText: "text-teal-600 dark:text-teal-400",
    sortIcon: "text-teal-600",
    meBorder: "border-teal-400 dark:border-teal-600",
    copyHover: "hover:text-teal-600 dark:hover:text-teal-400 focus-visible:ring-teal-500",
    rowHover: "hover:bg-teal-50/40 dark:hover:bg-teal-900/10",
    checkbox: "border-slate-300 dark:border-slate-600 data-[state=checked]:border-teal-600 data-[state=checked]:bg-teal-600 data-[state=checked]:text-white focus-visible:ring-teal-500/40",
    pillBg: "bg-teal-50 dark:bg-teal-900/30",
  },
  'Платное': {
    text: "text-amber-600 dark:text-amber-400",
    textStrong: "text-amber-800 dark:text-amber-300",
    textMuted: "text-amber-600/80 dark:text-amber-400/80",
    card: "bg-amber-50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900",
    cardBorder: "border-amber-200 dark:border-amber-900",
    blob: "bg-amber-500/10",
    badge: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 border-amber-100 dark:border-amber-900",
    rowBg: "bg-amber-50/40 dark:bg-amber-900/10",
    rowBorder: "border-b-amber-500 dark:border-b-amber-500",
    successBadge: "bg-amber-500 hover:bg-amber-600 dark:bg-amber-600 dark:hover:bg-amber-600/80",
    sidebarActive: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50",
    banner: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200",
    spinner: "text-amber-600",
    linkText: "text-amber-600 dark:text-amber-400",
    sortIcon: "text-amber-600",
    meBorder: "border-amber-400 dark:border-amber-600",
    copyHover: "hover:text-amber-600 dark:hover:text-amber-400 focus-visible:ring-amber-500",
    rowHover: "hover:bg-amber-50/40 dark:hover:bg-amber-900/10",
    checkbox: "border-slate-300 dark:border-slate-600 data-[state=checked]:border-amber-500 data-[state=checked]:bg-amber-500 data-[state=checked]:text-white focus-visible:ring-amber-500/40",
    pillBg: "bg-amber-50 dark:bg-amber-900/30",
  }
};

export function getAccentTheme(basis: BasisType): AccentTheme {
  return accentThemes[basis];
}
