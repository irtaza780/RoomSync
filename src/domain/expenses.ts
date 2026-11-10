import { MAX_CENTS, parseCents, sumCents, type MoneyErrorCode } from './money';
import {
  MEMBER_ORDER,
  type Balances,
  type Expense,
  type HouseholdData,
  type MemberId,
  type Settlement,
  type Split,
  type SplitType,
  type Transfer,
} from './types';

// ---------------------------------------------------------------------------
// Equal split with stable remainder allocation
// ---------------------------------------------------------------------------

export interface EqualSplitInfo {
  baseCents: number;
  remainderCents: number;
  /** Members who receive one extra cent, in stable household order. */
  extraCentTo: MemberId[];
  splits: Split[];
}

/**
 * Divide totalCents as evenly as possible. Remainder cents go one each to members in
 * the stable order Syed → Abin → Debbie, independent of payer or the active roommate.
 */
export function equalSplit(totalCents: number, participants: readonly MemberId[] = MEMBER_ORDER): EqualSplitInfo {
  if (!Number.isInteger(totalCents) || totalCents < 0) throw new Error('totalCents must be a non-negative integer');
  const ordered = MEMBER_ORDER.filter((m) => participants.includes(m));
  const n = ordered.length;
  if (n === 0) throw new Error('At least one participant is required');
  const baseCents = Math.floor(totalCents / n);
  const remainderCents = totalCents - baseCents * n;
  const extraCentTo = ordered.slice(0, remainderCents);
  const splits = ordered.map((userId, i) => ({ userId, owedCents: baseCents + (i < remainderCents ? 1 : 0) }));
  return { baseCents, remainderCents, extraCentTo, splits };
}

// ---------------------------------------------------------------------------
// Expense draft validation
// ---------------------------------------------------------------------------

export interface ExpenseDraft {
  title: string;
  amount: string;
  payerId: MemberId | '';
  splitType: SplitType;
  customShares: Record<MemberId, string>;
}

export interface AllocationIssue {
  kind: 'short' | 'over';
  diffCents: number;
}

export interface ExpenseErrors {
  title?: 'required' | 'tooLong';
  amount?: MoneyErrorCode;
  payer?: 'required';
  shares?: Partial<Record<MemberId, MoneyErrorCode>>;
  allocation?: AllocationIssue;
}

export interface ValidExpense {
  title: string;
  totalCents: number;
  payerId: MemberId;
  splitType: SplitType;
  splits: Split[];
}

export type ExpenseValidation = { ok: true; value: ValidExpense } | { ok: false; errors: ExpenseErrors };

export const TITLE_MAX = 60;

export function emptyExpenseDraft(payerId: MemberId): ExpenseDraft {
  return { title: '', amount: '', payerId, splitType: 'equal', customShares: { syed: '', abin: '', debbie: '' } };
}

/** Parse a custom share. Empty means zero for that member; negatives and >2 decimals are rejected. */
export function parseShare(raw: string): { ok: true; cents: number } | { ok: false; error: MoneyErrorCode } {
  if (raw.trim() === '') return { ok: true, cents: 0 };
  return parseCents(raw, { allowZero: true });
}

export interface AllocationSummary {
  totalCents: number | null;
  allocatedCents: number;
  remainingCents: number | null;
  hasShareErrors: boolean;
}

/** Live summary used by the custom split UI (total, allocated, remaining). */
export function allocationSummary(draft: ExpenseDraft): AllocationSummary {
  const total = parseCents(draft.amount);
  let allocated = 0;
  let hasShareErrors = false;
  for (const m of MEMBER_ORDER) {
    const p = parseShare(draft.customShares[m]);
    if (p.ok) allocated += p.cents;
    else hasShareErrors = true;
  }
  return {
    totalCents: total.ok ? total.cents : null,
    allocatedCents: allocated,
    remainingCents: total.ok ? total.cents - allocated : null,
    hasShareErrors,
  };
}

export function validateExpenseDraft(draft: ExpenseDraft): ExpenseValidation {
  const errors: ExpenseErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = 'required';
  else if (title.length > TITLE_MAX) errors.title = 'tooLong';

  const amount = parseCents(draft.amount);
  if (!amount.ok) errors.amount = amount.error;

  if (!draft.payerId || !MEMBER_ORDER.includes(draft.payerId)) errors.payer = 'required';

  let splits: Split[] = [];
  if (draft.splitType === 'equal') {
    if (amount.ok) splits = equalSplit(amount.cents).splits;
  } else {
    const shareErrors: Partial<Record<MemberId, MoneyErrorCode>> = {};
    for (const m of MEMBER_ORDER) {
      const p = parseShare(draft.customShares[m]);
      if (p.ok) splits.push({ userId: m, owedCents: p.cents });
      else shareErrors[m] = p.error;
    }
    if (Object.keys(shareErrors).length) errors.shares = shareErrors;
    else if (amount.ok) {
      const allocated = sumCents(splits.map((s) => s.owedCents));
      if (allocated < amount.cents) errors.allocation = { kind: 'short', diffCents: amount.cents - allocated };
      else if (allocated > amount.cents) errors.allocation = { kind: 'over', diffCents: allocated - amount.cents };
    }
  }

  if (Object.keys(errors).length || !amount.ok || !draft.payerId) return { ok: false, errors };
  return { ok: true, value: { title, totalCents: amount.cents, payerId: draft.payerId, splitType: draft.splitType, splits } };
}

/** Defensive invariant check used by the reducer before accepting any expense record. */
export function isConsistentExpense(e: Pick<Expense, 'totalCents' | 'splits' | 'payerId'>): boolean {
  return (
    Number.isInteger(e.totalCents) &&
    e.totalCents > 0 &&
    e.totalCents <= MAX_CENTS &&
    MEMBER_ORDER.includes(e.payerId) &&
    e.splits.every((s) => Number.isInteger(s.owedCents) && s.owedCents >= 0 && MEMBER_ORDER.includes(s.userId)) &&
    new Set(e.splits.map((s) => s.userId)).size === e.splits.length &&
    sumCents(e.splits.map((s) => s.owedCents)) === e.totalCents
  );
}

// ---------------------------------------------------------------------------
// Balances
// ---------------------------------------------------------------------------

export function zeroBalances(): Balances {
  return { syed: 0, abin: 0, debbie: 0 };
}

/**
 * Derive net balances from records.
 *  - Expense: payer +totalCents; every participant −owedCents (payer's own share included).
 *  - Settle-up (from paid to, outside the app): from +amount; to −amount.
 * Positive = the member is owed money. Negative = the member owes money.
 */
export function computeBalances(expenses: readonly Expense[], settlements: readonly Settlement[]): Balances {
  const b = zeroBalances();
  for (const e of expenses) {
    b[e.payerId] += e.totalCents;
    for (const s of e.splits) b[s.userId] -= s.owedCents;
  }
  for (const s of settlements) {
    b[s.fromUserId] += s.amountCents;
    b[s.toUserId] -= s.amountCents;
  }
  return b;
}

export function balancesOf(data: Pick<HouseholdData, 'expenses' | 'settlements'>): Balances {
  return computeBalances(data.expenses, data.settlements);
}

export function householdTotal(b: Balances): number {
  return sumCents(MEMBER_ORDER.map((m) => b[m]));
}

/** Net effect of a single expense on each member. */
export function expenseEffect(e: Expense): Balances {
  return computeBalances([e], []);
}

/**
 * Deterministic "who owes whom" breakdown.
 * Largest debtor pays largest creditor first; ties broken by stable member order.
 * Produces at most n−1 transfers and exactly clears every balance.
 */
export function suggestTransfers(b: Balances): Transfer[] {
  const idx = (m: MemberId) => MEMBER_ORDER.indexOf(m);
  const debtors = MEMBER_ORDER.filter((m) => b[m] < 0)
    .map((m) => ({ id: m, amt: -b[m] }))
    .sort((x, y) => y.amt - x.amt || idx(x.id) - idx(y.id));
  const creditors = MEMBER_ORDER.filter((m) => b[m] > 0)
    .map((m) => ({ id: m, amt: b[m] }))
    .sort((x, y) => y.amt - x.amt || idx(x.id) - idx(y.id));
  const out: Transfer[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].amt, creditors[j].amt);
    if (amount > 0) out.push({ fromUserId: debtors[i].id, toUserId: creditors[j].id, amountCents: amount });
    debtors[i].amt -= amount;
    creditors[j].amt -= amount;
    if (debtors[i].amt === 0) i++;
    if (creditors[j].amt === 0) j++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Settle-up validation
// ---------------------------------------------------------------------------

export interface SettlementDraft {
  fromUserId: MemberId | '';
  toUserId: MemberId | '';
  amount: string;
}

export interface SettlementErrors {
  from?: 'required';
  to?: 'required' | 'same';
  amount?: MoneyErrorCode | 'noOutstanding' | 'exceedsOutstanding';
  maxCents?: number;
}

export interface ValidSettlement {
  fromUserId: MemberId;
  toUserId: MemberId;
  amountCents: number;
}

export function outstandingBetween(b: Balances, from: MemberId, to: MemberId): number {
  return suggestTransfers(b).find((t) => t.fromUserId === from && t.toUserId === to)?.amountCents ?? 0;
}

/**
 * A settle-up records a payment made outside Room Sync. For this simplified PoC it may
 * not exceed the outstanding suggested amount between the selected payer and receiver.
 */
export function validateSettlementDraft(
  draft: SettlementDraft,
  b: Balances,
): { ok: true; value: ValidSettlement } | { ok: false; errors: SettlementErrors } {
  const errors: SettlementErrors = {};
  const from = draft.fromUserId;
  const to = draft.toUserId;
  if (!from || !MEMBER_ORDER.includes(from)) errors.from = 'required';
  if (!to || !MEMBER_ORDER.includes(to)) errors.to = 'required';
  else if (from === to) errors.to = 'same';

  const amount = parseCents(draft.amount);
  if (!amount.ok) errors.amount = amount.error;

  if (!errors.from && !errors.to && from && to) {
    const max = outstandingBetween(b, from, to);
    errors.maxCents = max;
    if (max === 0) errors.amount = 'noOutstanding';
    else if (amount.ok && amount.cents > max) errors.amount = 'exceedsOutstanding';
  }

  if (errors.from || errors.to || errors.amount || !amount.ok || !from || !to) return { ok: false, errors };
  return { ok: true, value: { fromUserId: from, toUserId: to, amountCents: amount.cents } };
}
