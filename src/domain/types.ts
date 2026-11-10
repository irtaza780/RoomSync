/**
 * Simplified Room Sync data model for the local PoC.
 *
 * Field names follow the D3 data model where practical (totalCents, owedCents,
 * amountCents, currentIndex, assigneeOrder…). All money is stored as integer cents.
 */

export type MemberId = 'syed' | 'abin' | 'debbie';
export type Lang = 'en' | 'fr';

/** Stable household order. Used for remainder cents, rotation and tie-breaking. */
export const MEMBER_ORDER: readonly MemberId[] = ['syed', 'abin', 'debbie'] as const;

export interface Member {
  id: MemberId;
  name: string;
  initials: string;
  /** Avatar background colour. */
  color: string;
}

export interface Household {
  id: string;
  name: string;
  city: string;
}

export type SplitType = 'equal' | 'custom';

export interface Split {
  userId: MemberId;
  owedCents: number;
}

export interface Expense {
  id: string;
  title: string;
  totalCents: number;
  payerId: MemberId;
  splitType: SplitType;
  splits: Split[];
  createdBy: MemberId;
  createdAt: string; // ISO timestamp (demo clock)
  week: number;
}

export interface Settlement {
  id: string;
  fromUserId: MemberId; // member who paid outside the app
  toUserId: MemberId; // member who received the payment
  amountCents: number;
  recordedBy: MemberId;
  settledAt: string;
  week: number;
}

export type Frequency = 'weekly';

export interface Chore {
  id: string;
  title: string;
  frequency: Frequency;
  /** Round-robin order. Always MEMBER_ORDER in this PoC. */
  assigneeOrder: MemberId[];
  /** Index into assigneeOrder of the member assigned for the current week. */
  currentIndex: number;
  createdWeek: number;
  createdBy: MemberId;
  createdAt: string;
}

export type AssignmentStatus = 'pending' | 'done';

export interface Assignment {
  id: string;
  choreId: string;
  week: number;
  assigneeId: MemberId;
  /** Local date string YYYY-MM-DD (Sunday of the assignment week). */
  dueAt: string;
  status: AssignmentStatus;
  completedAt?: string;
  completedWeek?: number;
  completedBy?: MemberId;
}

export type ActorId = MemberId | 'system';

export type ActivityEntry =
  | ActivityBase<'expense_added', { expenseId: string; title: string; totalCents: number; payerId: MemberId; splitType: SplitType }>
  | ActivityBase<'settlement_added', { settlementId: string; fromUserId: MemberId; toUserId: MemberId; amountCents: number }>
  | ActivityBase<'chore_created', { choreId: string; title: string; assigneeId: MemberId }>
  | ActivityBase<'chore_completed', { choreId: string; title: string; week: number; late: boolean }>
  | ActivityBase<'week_advanced', { week: number; rotated: number }>
  | ActivityBase<'chore_overdue', { choreId: string; title: string; assigneeId: MemberId; week: number }>
  | ActivityBase<'reward_proposed', { rewardId: string; title: string }>
  | ActivityBase<'reward_agreed', { rewardId: string; title: string }>;

interface ActivityBase<T extends string, P> {
  id: string;
  seq: number;
  type: T;
  actorId: ActorId;
  at: string;
  week: number;
  payload: P;
}

export type ActivityType = ActivityEntry['type'];

/** FR-14: a household-agreed, non-cash reward for the leaderboard leader. */
export interface HouseholdReward {
  id: string;
  title: string;
  proposedBy: MemberId;
  proposedAt: string;
  /** Members who agreed. The reward is active once every member has agreed. */
  agreedBy: MemberId[];
  agreedAt?: string;
}

export interface HouseholdData {
  household: Household;
  members: Member[];
  expenses: Expense[];
  settlements: Settlement[];
  chores: Chore[];
  assignments: Assignment[];
  activity: ActivityEntry[];
  /** Release 2 preview (FR-14). Older saved demos without this field load as null. */
  reward: HouseholdReward | null;
  currentWeek: number;
  /** Monotonic counter used to order activity entries. */
  seq: number;
}

export type ScenarioName = 'populated' | 'clean';

export interface Prefs {
  lang: Lang;
  activeMemberId: MemberId;
  secondViewerId: MemberId;
  showSecondPhone: boolean;
}

export interface AppState {
  scenario: ScenarioName;
  data: HouseholdData;
  prefs: Prefs;
}

export type Balances = Record<MemberId, number>;

export interface Transfer {
  fromUserId: MemberId;
  toUserId: MemberId;
  amountCents: number;
}
