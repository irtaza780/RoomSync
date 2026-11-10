import { weekStart } from '../domain/dates';
import type { ExpenseDraft } from '../domain/expenses';
import type { HouseholdData, Member, MemberId, ScenarioName } from '../domain/types';
import { householdReducer, type DataAction } from './reducer';

/**
 * Demo scenarios are built by replaying ordinary reducer actions, so every
 * seeded figure (balances, activity, assignments) is derived from records,
 * never hardcoded.
 */

export const MEMBERS: Member[] = [
  { id: 'syed', name: 'Syed', initials: 'SY', color: '#E7B53C' },
  { id: 'abin', name: 'Abin', initials: 'AB', color: '#8FB3A6' },
  { id: 'debbie', name: 'Debbie', initials: 'DE', color: '#D99A84' },
];

export function emptyHousehold(week = 1): HouseholdData {
  return {
    household: { id: 'apt-4b', name: 'Apartment 4B', city: 'Montréal' },
    members: MEMBERS.map((m) => ({ ...m })),
    expenses: [],
    settlements: [],
    chores: [],
    assignments: [],
    activity: [],
    currentWeek: week,
    seq: 0,
  };
}

/** Deterministic demo timestamp: week, weekday offset (0 = Monday), hour, minute. */
export function demoAt(week: number, day: number, hour: number, minute = 0): string {
  const s = weekStart(week);
  return new Date(s.getFullYear(), s.getMonth(), s.getDate() + day, hour, minute).toISOString();
}

const equal = (title: string, amount: string, payerId: MemberId): ExpenseDraft => ({
  title,
  amount,
  payerId,
  splitType: 'equal',
  customShares: { syed: '', abin: '', debbie: '' },
});

const custom = (title: string, amount: string, payerId: MemberId, shares: Record<MemberId, string>): ExpenseDraft => ({
  title,
  amount,
  payerId,
  splitType: 'custom',
  customShares: shares,
});

export function replay(start: HouseholdData, actions: DataAction[]): HouseholdData {
  return actions.reduce(householdReducer, start);
}

function cleanActions(): DataAction[] {
  return [
    { type: 'ADD_CHORE', id: 'chore-kitchen', at: demoAt(1, 0, 9), actorId: 'syed', draft: { title: 'Clean the kitchen', firstAssigneeId: 'syed' } },
    { type: 'ADD_CHORE', id: 'chore-trash', at: demoAt(1, 0, 9, 2), actorId: 'syed', draft: { title: 'Take out trash and recycling', firstAssigneeId: 'abin' } },
    { type: 'ADD_CHORE', id: 'chore-bathroom', at: demoAt(1, 0, 9, 4), actorId: 'syed', draft: { title: 'Clean the bathroom', firstAssigneeId: 'debbie' } },
  ];
}

function populatedActions(): DataAction[] {
  return [
    ...cleanActions(),
    // Week 1
    { type: 'ADD_EXPENSE', id: 'exp-groceries', at: demoAt(1, 1, 18, 20), actorId: 'syed', draft: equal('Groceries – Maxi', '86.40', 'syed') },
    { type: 'ADD_EXPENSE', id: 'exp-hydro', at: demoAt(1, 2, 12, 5), actorId: 'abin', draft: equal('Hydro-Québec bill', '64.21', 'abin') },
    {
      type: 'ADD_EXPENSE',
      id: 'exp-supplies',
      at: demoAt(1, 3, 17, 45),
      actorId: 'debbie',
      draft: custom('Cleaning supplies', '32.50', 'debbie', { syed: '10.00', abin: '12.50', debbie: '10.00' }),
    },
    { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-kitchen-w1', at: demoAt(1, 5, 11, 30), actorId: 'syed' },
    { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-trash-w1', at: demoAt(1, 6, 20, 15), actorId: 'abin' },
    // Bathroom (Debbie, week 1) is left incomplete → becomes overdue.
    { type: 'ADVANCE_WEEK', toWeek: 2, at: demoAt(2, 0, 0, 0) },
    // Week 2
    { type: 'ADD_EXPENSE', id: 'exp-internet', at: demoAt(2, 0, 8, 10), actorId: 'syed', draft: equal('Internet – Vidéotron', '75.00', 'syed') },
    {
      type: 'ADD_SETTLEMENT',
      id: 'set-abin-syed',
      at: demoAt(2, 0, 8, 40),
      actorId: 'abin',
      draft: { fromUserId: 'abin', toUserId: 'syed', amount: '15.00' },
    },
    { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-trash-w2', at: demoAt(2, 0, 9, 5), actorId: 'debbie' },
  ];
}

export function buildScenario(name: ScenarioName): HouseholdData {
  return replay(emptyHousehold(1), name === 'clean' ? cleanActions() : populatedActions());
}
