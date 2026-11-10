import { daysBetween, dueDateForWeek } from './dates';
import { MEMBER_ORDER, type Assignment, type Chore, type HouseholdData, type MemberId } from './types';

/**
 * Deterministic round-robin rule: Syed → Abin → Debbie → Syed.
 * Each weekly chore moves exactly one position each time the demo week advances.
 */

export function nextIndex(chore: Pick<Chore, 'currentIndex' | 'assigneeOrder'>): number {
  return (chore.currentIndex + 1) % chore.assigneeOrder.length;
}

export function currentAssignee(chore: Chore): MemberId {
  return chore.assigneeOrder[chore.currentIndex];
}

export function nextAssignee(chore: Chore): MemberId {
  return chore.assigneeOrder[nextIndex(chore)];
}

/** Assignee for any week ≥ createdWeek, derived purely from the rotation rule. */
export function assigneeForWeek(chore: Chore, week: number, startIndex: number): MemberId {
  const n = chore.assigneeOrder.length;
  const offset = week - chore.createdWeek;
  return chore.assigneeOrder[(((startIndex + offset) % n) + n) % n];
}

/** Preview of the next `count` weeks starting at `fromWeek` for a given first assignee. */
export function rotationPreview(firstAssignee: MemberId, fromWeek: number, count = 4): { week: number; assigneeId: MemberId }[] {
  const start = MEMBER_ORDER.indexOf(firstAssignee);
  return Array.from({ length: count }, (_, i) => ({
    week: fromWeek + i,
    assigneeId: MEMBER_ORDER[(start + i) % MEMBER_ORDER.length],
  }));
}

export function hasAssignment(assignments: readonly Assignment[], choreId: string, week: number): boolean {
  return assignments.some((a) => a.choreId === choreId && a.week === week);
}

/**
 * Rotate every weekly chore once and create assignments for `toWeek`.
 * Idempotent: a chore that already has an assignment for `toWeek` is left untouched,
 * so duplicate assignments for the same week are impossible.
 */
export function rotateForWeek(
  data: Pick<HouseholdData, 'chores' | 'assignments'>,
  toWeek: number,
): { chores: Chore[]; created: Assignment[] } {
  const created: Assignment[] = [];
  const chores = data.chores.map((c) => {
    if (c.frequency !== 'weekly' || c.createdWeek > toWeek || hasAssignment(data.assignments, c.id, toWeek)) return c;
    const idx = nextIndex(c);
    const rotated = { ...c, currentIndex: idx };
    created.push(newAssignment(rotated, toWeek));
    return rotated;
  });
  return { chores, created };
}

export function newAssignment(chore: Chore, week: number): Assignment {
  return {
    id: `asg-${chore.id}-w${week}`,
    choreId: chore.id,
    week,
    assigneeId: chore.assigneeOrder[chore.currentIndex],
    dueAt: dueDateForWeek(week),
    status: 'pending',
  };
}

// ---------------------------------------------------------------------------
// Status and reminders
// ---------------------------------------------------------------------------

export type ChoreStatus = 'completed' | 'overdue' | 'dueToday' | 'upcoming';

export function assignmentStatus(a: Assignment, today: string): ChoreStatus {
  if (a.status === 'done') return 'completed';
  const d = daysBetween(today, a.dueAt);
  if (d < 0) return 'overdue';
  if (d === 0) return 'dueToday';
  return 'upcoming';
}

export function daysUntilDue(a: Assignment, today: string): number {
  return daysBetween(today, a.dueAt);
}

/** Sort: overdue first, then due today, then upcoming, then completed; ties by due date and title order. */
export function sortAssignments(list: Assignment[], today: string): Assignment[] {
  const rank: Record<ChoreStatus, number> = { overdue: 0, dueToday: 1, upcoming: 2, completed: 3 };
  return [...list].sort(
    (a, b) =>
      rank[assignmentStatus(a, today)] - rank[assignmentStatus(b, today)] ||
      a.dueAt.localeCompare(b.dueAt) ||
      a.choreId.localeCompare(b.choreId),
  );
}

// ---------------------------------------------------------------------------
// Chore definition validation
// ---------------------------------------------------------------------------

export interface ChoreDraft {
  title: string;
  firstAssigneeId: MemberId | '';
}

export interface ChoreErrors {
  title?: 'required' | 'tooLong' | 'duplicate';
  assignee?: 'required';
}

export const CHORE_TITLE_MAX = 50;

export function validateChoreDraft(
  draft: ChoreDraft,
  existing: readonly Chore[],
): { ok: true; value: { title: string; firstAssigneeId: MemberId } } | { ok: false; errors: ChoreErrors } {
  const errors: ChoreErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'required';
  else if (title.length > CHORE_TITLE_MAX) errors.title = 'tooLong';
  else if (existing.some((c) => c.title.trim().toLocaleLowerCase() === title.toLocaleLowerCase())) errors.title = 'duplicate';
  if (!draft.firstAssigneeId || !MEMBER_ORDER.includes(draft.firstAssigneeId)) errors.assignee = 'required';
  if (errors.title || errors.assignee || !draft.firstAssigneeId) return { ok: false, errors };
  return { ok: true, value: { title, firstAssigneeId: draft.firstAssigneeId } };
}
