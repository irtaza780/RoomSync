import { newAssignment, rotateForWeek, validateChoreDraft, type ChoreDraft } from '../domain/chores';
import { isRewardAgreed, validateRewardTitle } from '../domain/rewards';
import { MEMBER_ORDER } from '../domain/types';
import {
  balancesOf,
  isConsistentExpense,
  validateExpenseDraft,
  validateSettlementDraft,
  type ExpenseDraft,
  type SettlementDraft,
} from '../domain/expenses';
import type { ActivityEntry, AppState, Chore, HouseholdData, Lang, MemberId, ScenarioName } from '../domain/types';
import { buildScenario } from './seed';

/**
 * Pure household reducer. IDs and timestamps are supplied by the caller so that
 * the same reducer can be replayed deterministically by the seed builder and the
 * validation checks, completely independently of the live demo state.
 */
export type DataAction =
  | { type: 'ADD_EXPENSE'; id: string; at: string; actorId: MemberId; draft: ExpenseDraft }
  | { type: 'ADD_SETTLEMENT'; id: string; at: string; actorId: MemberId; draft: SettlementDraft }
  | { type: 'ADD_CHORE'; id: string; at: string; actorId: MemberId; draft: ChoreDraft }
  | { type: 'COMPLETE_ASSIGNMENT'; assignmentId: string; at: string; actorId: MemberId }
  | { type: 'ADVANCE_WEEK'; toWeek: number; at: string }
  | { type: 'PROPOSE_REWARD'; id: string; at: string; actorId: MemberId; title: string }
  | { type: 'AGREE_REWARD'; rewardId: string; at: string; actorId: MemberId };

export type AppAction =
  | DataAction
  | { type: 'LOAD_SCENARIO'; scenario: ScenarioName }
  | { type: 'RESET' }
  | { type: 'HYDRATE'; state: AppState }
  | { type: 'SET_LANG'; lang: Lang }
  | { type: 'SET_ACTIVE_MEMBER'; memberId: MemberId }
  | { type: 'SET_SECOND_VIEWER'; memberId: MemberId }
  | { type: 'SET_SHOW_SECOND'; show: boolean };

type NewActivity = Omit<ActivityEntry, 'id' | 'seq' | 'week'> & { payload: unknown };

function withActivity(data: HouseholdData, entries: NewActivity[]): HouseholdData {
  let seq = data.seq;
  const added = entries.map((e) => {
    seq += 1;
    return { ...e, id: `act-${seq}`, seq, week: data.currentWeek } as ActivityEntry;
  });
  return { ...data, seq, activity: [...data.activity, ...added] };
}

export function householdReducer(data: HouseholdData, action: DataAction): HouseholdData {
  switch (action.type) {
    case 'ADD_EXPENSE': {
      // Idempotency: a repeated save with the same draft id never creates a second record.
      if (data.expenses.some((e) => e.id === action.id)) return data;
      const result = validateExpenseDraft(action.draft);
      if (!result.ok) return data;
      const v = result.value;
      if (!isConsistentExpense(v)) return data;
      const expense = {
        id: action.id,
        title: v.title,
        totalCents: v.totalCents,
        payerId: v.payerId,
        splitType: v.splitType,
        splits: v.splits,
        createdBy: action.actorId,
        createdAt: action.at,
        week: data.currentWeek,
      };
      return withActivity({ ...data, expenses: [...data.expenses, expense] }, [
        {
          type: 'expense_added',
          actorId: action.actorId,
          at: action.at,
          payload: { expenseId: expense.id, title: v.title, totalCents: v.totalCents, payerId: v.payerId, splitType: v.splitType },
        },
      ]);
    }

    case 'ADD_SETTLEMENT': {
      if (data.settlements.some((s) => s.id === action.id)) return data;
      const result = validateSettlementDraft(action.draft, balancesOf(data));
      if (!result.ok) return data;
      const s = { id: action.id, ...result.value, recordedBy: action.actorId, settledAt: action.at, week: data.currentWeek };
      return withActivity({ ...data, settlements: [...data.settlements, s] }, [
        {
          type: 'settlement_added',
          actorId: action.actorId,
          at: action.at,
          payload: { settlementId: s.id, fromUserId: s.fromUserId, toUserId: s.toUserId, amountCents: s.amountCents },
        },
      ]);
    }

    case 'ADD_CHORE': {
      if (data.chores.some((c) => c.id === action.id)) return data;
      const result = validateChoreDraft(action.draft, data.chores);
      if (!result.ok) return data;
      const chore: Chore = {
        id: action.id,
        title: result.value.title,
        frequency: 'weekly',
        assigneeOrder: [...MEMBER_ORDER],
        currentIndex: MEMBER_ORDER.indexOf(result.value.firstAssigneeId),
        createdWeek: data.currentWeek,
        createdBy: action.actorId,
        createdAt: action.at,
      };
      return withActivity(
        { ...data, chores: [...data.chores, chore], assignments: [...data.assignments, newAssignment(chore, data.currentWeek)] },
        [
          {
            type: 'chore_created',
            actorId: action.actorId,
            at: action.at,
            payload: { choreId: chore.id, title: chore.title, assigneeId: result.value.firstAssigneeId },
          },
        ],
      );
    }

    case 'COMPLETE_ASSIGNMENT': {
      const a = data.assignments.find((x) => x.id === action.assignmentId);
      // Only the assigned roommate can complete their chore, and only once.
      if (!a || a.status === 'done' || a.assigneeId !== action.actorId) return data;
      const chore = data.chores.find((c) => c.id === a.choreId);
      const late = data.currentWeek > a.week;
      const assignments = data.assignments.map((x) =>
        x.id === a.id
          ? { ...x, status: 'done' as const, completedAt: action.at, completedWeek: data.currentWeek, completedBy: action.actorId }
          : x,
      );
      return withActivity({ ...data, assignments }, [
        {
          type: 'chore_completed',
          actorId: action.actorId,
          at: action.at,
          payload: { choreId: a.choreId, title: chore?.title ?? '?', week: a.week, late },
        },
      ]);
    }

    case 'ADVANCE_WEEK': {
      // Guard against double-advancing (e.g. repeated clicks): only currentWeek + 1 is accepted.
      if (action.toWeek !== data.currentWeek + 1) return data;
      const missed = data.assignments.filter((a) => a.week === data.currentWeek && a.status === 'pending');
      const { chores, created } = rotateForWeek(data, action.toWeek);
      const next: HouseholdData = { ...data, currentWeek: action.toWeek, chores, assignments: [...data.assignments, ...created] };
      const titleOf = (id: string) => data.chores.find((c) => c.id === id)?.title ?? '?';
      return withActivity(next, [
        { type: 'week_advanced', actorId: 'system', at: action.at, payload: { week: action.toWeek, rotated: created.length } },
        ...missed.map((a) => ({
          type: 'chore_overdue' as const,
          actorId: 'system' as const,
          at: action.at,
          payload: { choreId: a.choreId, title: titleOf(a.choreId), assigneeId: a.assigneeId, week: a.week },
        })),
      ]);
    }

    case 'PROPOSE_REWARD': {
      if (data.reward?.id === action.id) return data;
      const v = validateRewardTitle(action.title);
      if (!v.ok) return data;
      // A new proposal replaces the previous one; the proposer counts as agreeing.
      const reward = { id: action.id, title: v.title, proposedBy: action.actorId, proposedAt: action.at, agreedBy: [action.actorId] };
      return withActivity({ ...data, reward }, [
        { type: 'reward_proposed', actorId: action.actorId, at: action.at, payload: { rewardId: reward.id, title: reward.title } },
      ]);
    }

    case 'AGREE_REWARD': {
      const r = data.reward;
      if (!r || r.id !== action.rewardId || r.agreedBy.includes(action.actorId)) return data;
      const agreedBy = MEMBER_ORDER.filter((m) => m === action.actorId || r.agreedBy.includes(m));
      const reward = { ...r, agreedBy, ...(isRewardAgreed({ agreedBy }) ? { agreedAt: action.at } : {}) };
      const next = { ...data, reward };
      return isRewardAgreed(reward)
        ? withActivity(next, [{ type: 'reward_agreed', actorId: action.actorId, at: action.at, payload: { rewardId: r.id, title: r.title } }])
        : next;
    }
  }
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'LOAD_SCENARIO':
      return { ...state, scenario: action.scenario, data: buildScenario(action.scenario) };
    case 'RESET':
      return initialAppState();
    case 'HYDRATE':
      return action.state;
    case 'SET_LANG':
      return state.prefs.lang === action.lang ? state : { ...state, prefs: { ...state.prefs, lang: action.lang } };
    case 'SET_ACTIVE_MEMBER':
      return { ...state, prefs: { ...state.prefs, activeMemberId: action.memberId } };
    case 'SET_SECOND_VIEWER':
      return { ...state, prefs: { ...state.prefs, secondViewerId: action.memberId } };
    case 'SET_SHOW_SECOND':
      return { ...state, prefs: { ...state.prefs, showSecondPhone: action.show } };
    default: {
      const data = householdReducer(state.data, action);
      return data === state.data ? state : { ...state, data };
    }
  }
}

export function initialAppState(): AppState {
  return {
    scenario: 'populated',
    data: buildScenario('populated'),
    prefs: { lang: 'en', activeMemberId: 'syed', secondViewerId: 'abin', showSecondPhone: false },
  };
}
