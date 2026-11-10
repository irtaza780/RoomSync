import type { Lang } from './types';

/**
 * Demo calendar. Demo week 1 starts on Monday 2 November 2026.
 * Weekly chores are due on the Sunday that ends their week.
 * The "demo clock" places "today" on the same weekday as the real clock, inside the current demo week,
 * so that advancing the demo week moves the whole household forward in time predictably.
 */
const BASE_YEAR = 2026;
const BASE_MONTH = 10; // November (0-based)
const BASE_DAY = 2; // Monday

export function weekStart(week: number): Date {
  return new Date(BASE_YEAR, BASE_MONTH, BASE_DAY + (week - 1) * 7);
}

export function weekEnd(week: number): Date {
  return new Date(BASE_YEAR, BASE_MONTH, BASE_DAY + (week - 1) * 7 + 6);
}

export function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function dueDateForWeek(week: number): string {
  return toDateKey(weekEnd(week));
}

/** Weekday offset 0 (Mon) … 6 (Sun). */
function weekdayOffset(d: Date): number {
  return (d.getDay() + 6) % 7;
}

/** The demo clock: same weekday and time as the real clock, within the given demo week. */
export function demoNow(week: number, real: Date = new Date()): Date {
  const start = weekStart(week);
  return new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + weekdayOffset(real),
    real.getHours(),
    real.getMinutes(),
    real.getSeconds(),
  );
}

export function demoToday(week: number, real: Date = new Date()): string {
  return toDateKey(demoNow(week, real));
}

/** Whole-day difference b - a for two YYYY-MM-DD keys. */
export function daysBetween(a: string, b: string): number {
  const ms = fromDateKey(b).getTime() - fromDateKey(a).getTime();
  return Math.round(ms / 86_400_000);
}

const locale = (lang: Lang) => (lang === 'fr' ? 'fr-CA' : 'en-CA');

export function formatShortDate(d: Date | string, lang: Lang): string {
  const date = typeof d === 'string' ? (d.length === 10 ? fromDateKey(d) : new Date(d)) : d;
  return new Intl.DateTimeFormat(locale(lang), { weekday: 'short', month: 'short', day: 'numeric' }).format(date);
}

export function formatDayMonth(d: Date | string, lang: Lang): string {
  const date = typeof d === 'string' ? (d.length === 10 ? fromDateKey(d) : new Date(d)) : d;
  return new Intl.DateTimeFormat(locale(lang), { month: 'short', day: 'numeric' }).format(date);
}

export function formatDateTime(iso: string, lang: Lang): string {
  return new Intl.DateTimeFormat(locale(lang), {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function formatWeekRange(week: number, lang: Lang): string {
  return `${formatDayMonth(weekStart(week), lang)} – ${formatDayMonth(weekEnd(week), lang)}`;
}
