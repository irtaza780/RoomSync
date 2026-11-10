/**
 * Gamification (FR-13 points & streaks, FR-14 leaderboard & agreed rewards).
 * Release 2 preview. Like balances, points are never stored: they are derived from
 * chore assignments and settle-up records, so they can't drift from what happened.
 *
 * Scoring rule:
 *   +10  chore completed in its own week (by the Sunday due date)
 *    +3  chore completed late (in a later week)
 *    +5  settle-up recorded, credited to the roommate who paid
 * Streak: consecutive weeks in which a roommate had chores and completed all of them on time.
 * The current week only counts once it is fully done, and an unfinished current week does not break a streak.
 */
import { MEMBER_ORDER, type HouseholdData, type MemberId } from './types';

export const POINTS = { choreOnTime: 10, choreLate: 3, settleUp: 5 } as const;

export type PointSource = 'chore_on_time' | 'chore_late' | 'settle_up';

/** Mirrors the D3 `points` entity: userId, sourceType, deltaPoints, awardedAt. */
export interface PointEntry {
  userId: MemberId;
  sourceType: PointSource;
  deltaPoints: number;
  refId: string;
  week: number;
  awardedAt: string;
}

export function isOnTime(a: { status: string; week: number; completedWeek?: number }): boolean {
  return a.status === 'done' && (a.completedWeek ?? a.week) <= a.week;
}

export function pointLedger(data: Pick<HouseholdData, 'assignments' | 'settlements'>): PointEntry[] {
  const out: PointEntry[] = [];
  for (const a of data.assignments) {
    if (a.status !== 'done') continue;
    const onTime = isOnTime(a);
    out.push({
      userId: a.completedBy ?? a.assigneeId,
      sourceType: onTime ? 'chore_on_time' : 'chore_late',
      deltaPoints: onTime ? POINTS.choreOnTime : POINTS.choreLate,
      refId: a.id,
      week: a.completedWeek ?? a.week,
      awardedAt: a.completedAt ?? '',
    });
  }
  for (const s of data.settlements) {
    out.push({ userId: s.fromUserId, sourceType: 'settle_up', deltaPoints: POINTS.settleUp, refId: s.id, week: s.week, awardedAt: s.settledAt });
  }
  return out.sort((x, y) => x.awardedAt.localeCompare(y.awardedAt));
}

export function pointsByMember(data: Pick<HouseholdData, 'assignments' | 'settlements'>): Record<MemberId, number> {
  const p: Record<MemberId, number> = { syed: 0, abin: 0, debbie: 0 };
  for (const e of pointLedger(data)) p[e.userId] += e.deltaPoints;
  return p;
}

export function streakOf(data: Pick<HouseholdData, 'assignments' | 'currentWeek'>, member: MemberId): number {
  let streak = 0;
  for (let w = data.currentWeek; w >= 1; w--) {
    const mine = data.assignments.filter((a) => a.week === w && a.assigneeId === member);
    if (mine.length === 0) continue; // weeks with nothing assigned neither count nor break
    const allOnTime = mine.every(isOnTime);
    if (w === data.currentWeek) {
      if (allOnTime) streak++;
      continue; // an unfinished current week doesn't break the streak
    }
    if (!allOnTime) break;
    streak++;
  }
  return streak;
}

export interface LeaderboardRow {
  memberId: MemberId;
  points: number;
  streak: number;
  rank: number;
}

/** Sorted by points, then streak, then stable household order. Equal scores share a rank. */
export function leaderboard(data: Pick<HouseholdData, 'assignments' | 'settlements' | 'currentWeek'>): LeaderboardRow[] {
  const pts = pointsByMember(data);
  const rows = MEMBER_ORDER.map((m) => ({ memberId: m, points: pts[m], streak: streakOf(data, m), rank: 0 })).sort(
    (a, b) => b.points - a.points || b.streak - a.streak || MEMBER_ORDER.indexOf(a.memberId) - MEMBER_ORDER.indexOf(b.memberId),
  );
  rows.forEach((r, i) => {
    const prev = rows[i - 1];
    r.rank = prev && prev.points === r.points && prev.streak === r.streak ? prev.rank : i + 1;
  });
  return rows;
}

// ---------------------------------------------------------------------------
// Household-agreed reward (never cash)
// ---------------------------------------------------------------------------

export const REWARD_TITLE_MAX = 40;
const CASH_PATTERN = /(\$|€|£|¢|\bcash\b|\bmoney\b|\bcad\b|\bdollars?\b|\bbucks?\b|\bargent\b|\bcomptant\b|\bpiastres?\b|e-?transfer|virement)/i;

export type RewardError = 'required' | 'tooLong' | 'cash';

export function validateRewardTitle(raw: string): { ok: true; title: string } | { ok: false; error: RewardError } {
  const title = raw.trim();
  if (!title) return { ok: false, error: 'required' };
  if (title.length > REWARD_TITLE_MAX) return { ok: false, error: 'tooLong' };
  if (CASH_PATTERN.test(title)) return { ok: false, error: 'cash' };
  return { ok: true, title };
}

export function isRewardAgreed(r: { agreedBy: MemberId[] } | null): boolean {
  return !!r && MEMBER_ORDER.every((m) => r.agreedBy.includes(m));
}
