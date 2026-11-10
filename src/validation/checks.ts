/**
 * Deterministic validation checks.
 *
 * Every check runs against the real calculation, reducer and persistence functions,
 * on freshly built isolated state (and an in-memory key-value store for persistence).
 * Nothing here reads from or writes to the live demo or window.localStorage.
 * Pass/fail is computed by comparing actual results with expected values.
 */
import { assigneeForWeek } from '../domain/chores';
import {
  balancesOf,
  equalSplit,
  householdTotal,
  suggestTransfers,
  validateExpenseDraft,
  validateSettlementDraft,
  type ExpenseDraft,
} from '../domain/expenses';
import { formatCents, parseCents } from '../domain/money';
import { isRewardAgreed, leaderboard, pointsByMember, streakOf } from '../domain/rewards';
import { MEMBER_ORDER, type AppState, type Balances, type HouseholdData, type MemberId } from '../domain/types';
import { getTranslator } from '../i18n';
import { appReducer, householdReducer, type DataAction } from '../state/reducer';
import { buildScenario, demoAt, emptyHousehold, replay } from '../state/seed';
import { loadState, MemoryStore, saveState, STORAGE_KEY } from '../state/storage';

export interface CheckResult {
  id: string;
  title: string;
  requirements: string[];
  setup: string;
  expected: string[];
  actual: string[];
  pass: boolean;
  error?: string;
}

const $ = (c: number) => formatCents(c, 'en');
const $s = (c: number) => formatCents(c, 'en', { signed: true });
const NAME: Record<MemberId, string> = { syed: 'Syed', abin: 'Abin', debbie: 'Debbie' };

const fmtBalances = (b: Balances) => MEMBER_ORDER.map((m) => `${NAME[m]} ${$s(b[m])}`).join(', ');
const sameBalances = (a: Balances, b: Balances) => MEMBER_ORDER.every((m) => a[m] === b[m]);

const AT = demoAt(1, 0, 12);
let n = 0;
const nid = (p: string) => `${p}-check-${++n}`;

function zeroStart(): HouseholdData {
  return emptyHousehold(1);
}

function expenseAction(draft: Partial<ExpenseDraft> & Pick<ExpenseDraft, 'amount' | 'payerId'>, id = nid('exp')): DataAction {
  return {
    type: 'ADD_EXPENSE',
    id,
    at: AT,
    actorId: (draft.payerId || 'syed') as MemberId,
    draft: {
      title: draft.title ?? 'Validation expense',
      amount: draft.amount,
      payerId: draft.payerId,
      splitType: draft.splitType ?? 'equal',
      customShares: draft.customShares ?? { syed: '', abin: '', debbie: '' },
    },
  };
}

function run(id: string, title: string, requirements: string[], setup: string, fn: () => Omit<CheckResult, 'id' | 'title' | 'requirements' | 'setup'>): CheckResult {
  try {
    return { id, title, requirements, setup, ...fn() };
  } catch (err) {
    return { id, title, requirements, setup, expected: [], actual: [], pass: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ---------------------------------------------------------------------------

function scenarioA(): CheckResult {
  return run('A', 'Equal expense split', ['FR-03', 'FR-04', 'NFR-05'], 'Zero balances. Syed pays $60.00, split equally among all three members.', () => {
    const s = householdReducer(zeroStart(), expenseAction({ amount: '60.00', payerId: 'syed' }));
    const b = balancesOf(s);
    const expected: Balances = { syed: 4000, abin: -2000, debbie: -2000 };
    const total = householdTotal(b);
    return {
      expected: [`Balances: ${fmtBalances(expected)}`, 'Household total: $0.00', 'Expenses recorded: 1'],
      actual: [`Balances: ${fmtBalances(b)}`, `Household total: ${$(total)}`, `Expenses recorded: ${s.expenses.length}`],
      pass: sameBalances(b, expected) && total === 0 && s.expenses.length === 1,
    };
  });
}

function scenarioB(): CheckResult {
  return run('B', 'Remainder cents', ['FR-03', 'NFR-05'], 'Zero balances. Syed pays $10.00, split equally. Remainder follows Syed → Abin → Debbie.', () => {
    const s = householdReducer(zeroStart(), expenseAction({ amount: '10.00', payerId: 'syed' }));
    const shares = MEMBER_ORDER.map((m) => s.expenses[0]?.splits.find((x) => x.userId === m)?.owedCents ?? NaN);
    const b = balancesOf(s);
    const expected: Balances = { syed: 666, abin: -333, debbie: -333 };
    // Remainder allocation must not depend on who the payer / active roommate is.
    const asDebbie = equalSplit(1000).splits.map((x) => x.owedCents);
    const total = householdTotal(b);
    return {
      expected: ['Shares: $3.34, $3.33, $3.33', `Balances: ${fmtBalances(expected)}`, 'Household total: $0.00', 'Share sum: $10.00'],
      actual: [
        `Shares: ${shares.map($).join(', ')}`,
        `Balances: ${fmtBalances(b)}`,
        `Household total: ${$(total)}`,
        `Share sum: ${$(shares.reduce((a, c) => a + c, 0))}`,
      ],
      pass:
        shares.join() === '334,333,333' &&
        asDebbie.join() === '334,333,333' &&
        sameBalances(b, expected) &&
        total === 0,
    };
  });
}

function scenarioC(): CheckResult {
  return run('C', 'Custom split', ['FR-03', 'FR-04', 'NFR-05'], 'Zero balances. Debbie pays $49.00. Shares: Syed $20.00, Abin $14.50, Debbie $14.50.', () => {
    const s = householdReducer(
      zeroStart(),
      expenseAction({ amount: '49.00', payerId: 'debbie', splitType: 'custom', customShares: { syed: '20.00', abin: '14.50', debbie: '14.50' } }),
    );
    const b = balancesOf(s);
    const expected: Balances = { syed: -2000, abin: -1450, debbie: 3450 };
    const total = householdTotal(b);
    return {
      expected: [`Balances: ${fmtBalances(expected)}`, 'Household total: $0.00'],
      actual: [`Balances: ${fmtBalances(b)}`, `Household total: ${$(total)}`],
      pass: sameBalances(b, expected) && total === 0 && s.expenses.length === 1,
    };
  });
}

function scenarioD(): CheckResult {
  return run('D', 'External settle-up', ['FR-05', 'FR-04', 'NFR-05'], 'Start from Scenario A. Abin records paying Syed $20.00 outside the app.', () => {
    const a = householdReducer(zeroStart(), expenseAction({ amount: '60.00', payerId: 'syed' }));
    const s = householdReducer(a, {
      type: 'ADD_SETTLEMENT',
      id: nid('set'),
      at: AT,
      actorId: 'abin',
      draft: { fromUserId: 'abin', toUserId: 'syed', amount: '20.00' },
    });
    const b = balancesOf(s);
    const expected: Balances = { syed: 2000, abin: 0, debbie: -2000 };
    // Over-payment guard: Debbie cannot record paying Syed more than the $20.00 she owes.
    const over = validateSettlementDraft({ fromUserId: 'debbie', toUserId: 'syed', amount: '20.01' }, b);
    const total = householdTotal(b);
    return {
      expected: [`Balances: ${fmtBalances(expected)}`, 'Household total: $0.00', 'Settle-ups recorded: 1', 'Paying $20.01 against $20.00 owed: blocked'],
      actual: [
        `Balances: ${fmtBalances(b)}`,
        `Household total: ${$(total)}`,
        `Settle-ups recorded: ${s.settlements.length}`,
        `Paying $20.01 against $20.00 owed: ${over.ok ? 'allowed' : `blocked (${over.errors.amount})`}`,
      ],
      pass: sameBalances(b, expected) && total === 0 && s.settlements.length === 1 && !over.ok && over.errors.amount === 'exceedsOutstanding',
    };
  });
}

function scenarioE(): CheckResult {
  return run('E', 'Invalid custom split is blocked', ['FR-03', 'NFR-05'], 'A $30.00 expense with custom shares totalling $29.99 ($10.00 + $10.00 + $9.99).', () => {
    const start = householdReducer(zeroStart(), expenseAction({ amount: '12.00', payerId: 'abin' })); // non-empty baseline
    const draft: ExpenseDraft = {
      title: 'Invalid split',
      amount: '30.00',
      payerId: 'syed',
      splitType: 'custom',
      customShares: { syed: '10.00', abin: '10.00', debbie: '9.99' },
    };
    const v = validateExpenseDraft(draft);
    const after = householdReducer(start, { type: 'ADD_EXPENSE', id: nid('exp'), at: AT, actorId: 'syed', draft });
    const feedbackEn =
      !v.ok && v.errors.allocation ? getTranslator('en').t('err.alloc.short', { amount: $(v.errors.allocation.diffCents), total: $(3000) }) : '(none)';
    const unchanged =
      after === start &&
      after.expenses.length === start.expenses.length &&
      after.activity.length === start.activity.length &&
      sameBalances(balancesOf(after), balancesOf(start));
    return {
      expected: ['Save blocked: yes', 'Feedback: $0.01 still to allocate', 'New expenses / activity / balance changes: none'],
      actual: [
        `Save blocked: ${v.ok ? 'no' : 'yes'}`,
        `Feedback: ${feedbackEn}`,
        `New expenses / activity / balance changes: ${unchanged ? 'none' : 'state changed'}`,
      ],
      pass: !v.ok && v.errors.allocation?.kind === 'short' && v.errors.allocation.diffCents === 1 && unchanged,
    };
  });
}

function scenarioF(): CheckResult {
  return run('F', 'Weekly chore rotation', ['FR-06', 'FR-07', 'FR-08'], 'A weekly chore starts with Syed in week 1. It is completed, then the demo week advances three times.', () => {
    let s = householdReducer(zeroStart(), {
      type: 'ADD_CHORE',
      id: 'chore-f',
      at: AT,
      actorId: 'syed',
      draft: { title: 'Rotation check', firstAssigneeId: 'syed' },
    });
    s = householdReducer(s, { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-f-w1', at: AT, actorId: 'syed' });
    for (const w of [2, 3, 4]) {
      s = householdReducer(s, { type: 'ADVANCE_WEEK', toWeek: w, at: demoAt(w, 0, 0) });
      s = householdReducer(s, { type: 'ADVANCE_WEEK', toWeek: w, at: demoAt(w, 0, 0) }); // repeated click: ignored
    }
    const seq = [1, 2, 3, 4].map((w) => s.assignments.find((a) => a.choreId === 'chore-f' && a.week === w)?.assigneeId ?? '—');
    const derived = [1, 2, 3, 4].map((w) => assigneeForWeek(s.chores[0], w, 0));
    const keys = s.assignments.map((a) => `${a.choreId}:${a.week}`);
    const dupes = keys.length - new Set(keys).size;
    const week1 = s.assignments.find((a) => a.week === 1);
    return {
      expected: ['Weeks 1–4: Syed → Abin → Debbie → Syed', 'Week 1 completion kept: done', 'Duplicate assignments: 0', 'Current week: 4'],
      actual: [
        `Weeks 1–4: ${seq.map((m) => NAME[m as MemberId] ?? m).join(' → ')}`,
        `Week 1 completion kept: ${week1?.status ?? 'missing'}`,
        `Duplicate assignments: ${dupes}`,
        `Current week: ${s.currentWeek}`,
      ],
      pass:
        seq.join() === 'syed,abin,debbie,syed' &&
        derived.join() === seq.join() &&
        week1?.status === 'done' &&
        dupes === 0 &&
        s.currentWeek === 4,
    };
  });
}

function scenarioG(): CheckResult {
  return run(
    'G',
    'Local persistence across reload',
    ['NFR-01', 'NFR-05', 'FR-08'],
    'Clean scenario in an isolated in-memory store: add an expense, complete a chore, switch to French, save, then reload from storage.',
    () => {
      const store = new MemoryStore();
      let st: AppState = {
        scenario: 'clean',
        data: buildScenario('clean'),
        prefs: { lang: 'en', activeMemberId: 'syed', secondViewerId: 'abin', showSecondPhone: false },
      };
      st = appReducer(st, expenseAction({ title: 'Persisted expense', amount: '45.00', payerId: 'abin' }, 'exp-persist'));
      st = appReducer(st, { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-kitchen-w1', at: AT, actorId: 'syed' });
      st = appReducer(st, { type: 'SET_LANG', lang: 'fr' });
      const saved = saveState(store, st);
      const reloaded = loadState(store); // simulates a page refresh
      const r = reloaded.state;
      const b = balancesOf(r.data);
      const expectedB = balancesOf(st.data);
      const expensePresent = r.data.expenses.some((e) => e.id === 'exp-persist');
      const choreDone = r.data.assignments.find((a) => a.id === 'asg-chore-kitchen-w1')?.status;
      // Malformed data must be handled gracefully.
      const bad = new MemoryStore();
      bad.setItem(STORAGE_KEY, '{"version":1,"state":{oops');
      const badLoad = loadState(bad);
      return {
        expected: [
          'Reload status: ok',
          'Expense present after reload: yes',
          `Balances after reload: ${fmtBalances(expectedB)} (total $0.00)`,
          'Chore completion after reload: done',
          'Language after reload: fr',
          'Malformed saved data: detected, demo restored',
        ],
        actual: [
          `Reload status: ${reloaded.status}`,
          `Expense present after reload: ${expensePresent ? 'yes' : 'no'}`,
          `Balances after reload: ${fmtBalances(b)} (total ${$(householdTotal(b))})`,
          `Chore completion after reload: ${choreDone ?? 'missing'}`,
          `Language after reload: ${r.prefs.lang}`,
          `Malformed saved data: ${badLoad.status === 'corrupt' ? 'detected, demo restored' : badLoad.status}`,
        ],
        pass:
          saved.ok &&
          reloaded.status === 'ok' &&
          expensePresent &&
          sameBalances(b, expectedB) &&
          householdTotal(b) === 0 &&
          choreDone === 'done' &&
          r.prefs.lang === 'fr' &&
          badLoad.status === 'corrupt' &&
          badLoad.state.data.expenses.length > 0,
      };
    },
  );
}

function checkPerspective(): CheckResult {
  return run('H', 'Switching active roommate preserves totals', ['FR-04', 'NFR-05'], 'Populated demo. Switch the active roommate Syed → Abin → Debbie and compare derived balances.', () => {
    let st: AppState = { scenario: 'populated', data: buildScenario('populated'), prefs: { lang: 'en', activeMemberId: 'syed', secondViewerId: 'abin', showSecondPhone: false } };
    const before = balancesOf(st.data);
    const seen: string[] = [];
    let unchanged = true;
    let zero = true;
    for (const m of MEMBER_ORDER) {
      st = appReducer(st, { type: 'SET_ACTIVE_MEMBER', memberId: m });
      const b = balancesOf(st.data);
      seen.push(`${NAME[m]} sees own balance ${$s(b[m])}`);
      unchanged = unchanged && sameBalances(b, before);
      zero = zero && householdTotal(b) === 0;
    }
    return {
      expected: [`Household balances unchanged: ${fmtBalances(before)}`, 'Household total: $0.00 for every perspective'],
      actual: [
        unchanged ? `Household balances unchanged: ${fmtBalances(balancesOf(st.data))}` : 'Household balances changed',
        zero ? 'Household total: $0.00 for every perspective' : 'Household total not zero',
        ...seen,
      ],
      pass: unchanged && zero,
    };
  });
}

function checkLanguage(): CheckResult {
  return run('I', 'Switching language preserves data', ['NFR-01', 'NFR-05'], 'Populated demo. Switch EN → FR → EN; compare records and integer-cent balances.', () => {
    const st0: AppState = { scenario: 'populated', data: buildScenario('populated'), prefs: { lang: 'en', activeMemberId: 'syed', secondViewerId: 'abin', showSecondPhone: false } };
    const st1 = appReducer(st0, { type: 'SET_LANG', lang: 'fr' });
    const st2 = appReducer(st1, { type: 'SET_LANG', lang: 'en' });
    const sameData = st1.data === st0.data && st2.data === st0.data;
    const b = balancesOf(st1.data);
    // French decimal comma is parsed to the same integer cents.
    const p1 = parseCents('12.50');
    const p2 = parseCents('12,50');
    return {
      expected: ['Household records identical: yes', 'Syed: $40.00 (EN) / 40,00 $ (FR) from the same 4000 cents', '"12.50" and "12,50" → 1250 cents'],
      actual: [
        `Household records identical: ${sameData ? 'yes' : 'no'}`,
        `Syed: ${formatCents(4000, 'en')} (EN) / ${formatCents(4000, 'fr')} (FR) from the same 4000 cents; current balance ${formatCents(b.syed, 'fr', { signed: true })}`,
        `"12.50" and "12,50" → ${p1.ok ? p1.cents : 'error'} / ${p2.ok ? p2.cents : 'error'} cents`,
      ],
      pass: sameData && p1.ok && p2.ok && p1.cents === 1250 && p2.cents === 1250 && formatCents(4000, 'fr').replace(/\s/g, ' ').startsWith('40,00'),
    };
  });
}

function checkInputValidation(): CheckResult {
  return run('J', 'Expense input validation', ['FR-03'], 'Submit drafts with an empty description, invalid, zero, negative and over-precise amounts, a negative share and over-allocated shares.', () => {
    const base: ExpenseDraft = { title: 'Test', amount: '10.00', payerId: 'syed', splitType: 'equal', customShares: { syed: '', abin: '', debbie: '' } };
    const cases: [string, ExpenseDraft, (e: Record<string, unknown>) => boolean][] = [
      ['empty description', { ...base, title: '   ' }, (e) => e.title === 'required'],
      ['empty amount', { ...base, amount: '' }, (e) => e.amount === 'empty'],
      ['amount "abc"', { ...base, amount: 'abc' }, (e) => e.amount === 'invalid'],
      ['amount 0', { ...base, amount: '0' }, (e) => e.amount === 'zero'],
      ['amount −5', { ...base, amount: '-5' }, (e) => e.amount === 'negative'],
      ['amount 10.005', { ...base, amount: '10.005' }, (e) => e.amount === 'tooManyDecimals'],
      ['negative custom share', { ...base, splitType: 'custom', customShares: { syed: '-1.00', abin: '6.00', debbie: '5.00' } }, (e) => (e.shares as Record<string, string>)?.syed === 'negative'],
      ['shares exceed total', { ...base, splitType: 'custom', customShares: { syed: '5.00', abin: '5.00', debbie: '0.01' } }, (e) => (e.allocation as { kind: string })?.kind === 'over'],
    ];
    const results = cases.map(([label, d, ok]) => {
      const v = validateExpenseDraft(d);
      const blocked = !v.ok && ok(v.errors as Record<string, unknown>);
      return { label, blocked, code: v.ok ? 'accepted' : JSON.stringify(v.errors) };
    });
    return {
      expected: cases.map(([label]) => `${label}: blocked with specific error`),
      actual: results.map((r) => `${r.label}: ${r.blocked ? 'blocked' : 'NOT blocked'} ${r.code}`),
      pass: results.every((r) => r.blocked),
    };
  });
}

function checkDoubleSubmit(): CheckResult {
  return run('K', 'Repeated save creates one record', ['FR-03'], 'Dispatch the same add-expense action (same draft id) three times, as a rapid double/triple click would.', () => {
    const action = expenseAction({ amount: '25.00', payerId: 'debbie' }, 'exp-dup');
    const s = replay(zeroStart(), [action, action, action]);
    return {
      expected: ['Expenses: 1', 'Activity entries: 1', 'Household total: $0.00'],
      actual: [`Expenses: ${s.expenses.length}`, `Activity entries: ${s.activity.length}`, `Household total: ${$(householdTotal(balancesOf(s)))}`],
      pass: s.expenses.length === 1 && s.activity.length === 1 && householdTotal(balancesOf(s)) === 0,
    };
  });
}

/** Small seeded PRNG (mulberry32) so the stress test is reproducible. */
function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function checkZeroSumStress(): CheckResult {
  return run('L', 'Zero-sum invariant under 500 random records', ['NFR-05', 'FR-04', 'FR-05'], 'Seed 20261109: 400 random equal/custom expenses and up to 100 valid settle-ups, checking the invariant after every step.', () => {
    const rnd = prng(20261109);
    let s = zeroStart();
    let violations = 0;
    let nonInteger = 0;
    let settlements = 0;
    const pick = () => MEMBER_ORDER[Math.floor(rnd() * 3)];
    const centsStr = (c: number) => `${Math.floor(c / 100)}.${String(c % 100).padStart(2, '0')}`;
    for (let i = 0; i < 500; i++) {
      if (i % 5 === 4) {
        const t = suggestTransfers(balancesOf(s))[0];
        if (t) {
          const amt = 1 + Math.floor(rnd() * t.amountCents);
          const before = s.settlements.length;
          s = householdReducer(s, { type: 'ADD_SETTLEMENT', id: `st-${i}`, at: AT, actorId: t.fromUserId, draft: { fromUserId: t.fromUserId, toUserId: t.toUserId, amount: centsStr(amt) } });
          settlements += s.settlements.length - before;
        }
      } else {
        const total = 1 + Math.floor(rnd() * 50000);
        if (rnd() < 0.5) s = householdReducer(s, expenseAction({ amount: centsStr(total), payerId: pick() }, `e-${i}`));
        else {
          const a = Math.floor(rnd() * (total + 1));
          const b = Math.floor(rnd() * (total - a + 1));
          const c = total - a - b;
          s = householdReducer(
            s,
            expenseAction({ amount: centsStr(total), payerId: pick(), splitType: 'custom', customShares: { syed: centsStr(a), abin: centsStr(b), debbie: centsStr(c) } }, `e-${i}`),
          );
        }
      }
      const bal = balancesOf(s);
      if (householdTotal(bal) !== 0) violations++;
      if (!MEMBER_ORDER.every((m) => Number.isSafeInteger(bal[m]))) nonInteger++;
    }
    const transfers = suggestTransfers(balancesOf(s));
    const after = { ...balancesOf(s) };
    for (const t of transfers) {
      after[t.fromUserId] += t.amountCents;
      after[t.toUserId] -= t.amountCents;
    }
    const cleared = MEMBER_ORDER.every((m) => after[m] === 0);
    return {
      expected: ['Expenses accepted: 400', 'Zero-sum violations: 0', 'Non-integer balances: 0', 'Suggested transfers clear all balances: yes'],
      actual: [
        `Expenses accepted: ${s.expenses.length} (settle-ups: ${settlements})`,
        `Zero-sum violations: ${violations}`,
        `Non-integer balances: ${nonInteger}`,
        `Suggested transfers clear all balances: ${cleared ? 'yes' : 'no'} (${transfers.length} transfer${transfers.length === 1 ? '' : 's'})`,
      ],
      pass: s.expenses.length === 400 && violations === 0 && nonInteger === 0 && cleared,
    };
  });
}

function checkGamification(): CheckResult {
  return run(
    'M',
    'Points, streaks, leaderboard and agreed reward (Release 2 preview)',
    ['FR-13', 'FR-14'],
    'Clean scenario. W1: Syed does his chore on time; Abin records a $10.00 settle-up. W2: Abin finishes his W1 chore late; Syed does his W2 chore on time. Then week 3 starts. A "$20 cash" reward is proposed, then "Skip one dish week", which all three agree to.',
    () => {
      const at = (w: number) => demoAt(w, 2, 12);
      let s = buildScenario('clean');
      s = replay(s, [
        { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-kitchen-w1', at: at(1), actorId: 'syed' },
        expenseAction({ amount: '30.00', payerId: 'syed' }, 'exp-m'),
        { type: 'ADD_SETTLEMENT', id: 'set-m', at: at(1), actorId: 'abin', draft: { fromUserId: 'abin', toUserId: 'syed', amount: '10.00' } },
        { type: 'ADVANCE_WEEK', toWeek: 2, at: demoAt(2, 0, 0) },
        { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-trash-w1', at: at(2), actorId: 'abin' },
        { type: 'COMPLETE_ASSIGNMENT', assignmentId: 'asg-chore-bathroom-w2', at: at(2), actorId: 'syed' },
        { type: 'ADVANCE_WEEK', toWeek: 3, at: demoAt(3, 0, 0) },
      ]);
      const pts = pointsByMember(s);
      const streaks = MEMBER_ORDER.map((m) => streakOf(s, m));
      const order = leaderboard(s).map((r) => NAME[r.memberId]);
      const cash = replay(s, [{ type: 'PROPOSE_REWARD', id: 'r-cash', at: at(3), actorId: 'debbie', title: '$20 cash' }]);
      let r = replay(s, [{ type: 'PROPOSE_REWARD', id: 'r-dish', at: at(3), actorId: 'syed', title: 'Skip one dish week' }]);
      r = householdReducer(r, { type: 'AGREE_REWARD', rewardId: 'r-dish', at: at(3), actorId: 'abin' });
      const partial = isRewardAgreed(r.reward);
      r = householdReducer(r, { type: 'AGREE_REWARD', rewardId: 'r-dish', at: at(3), actorId: 'debbie' });
      r = householdReducer(r, { type: 'AGREE_REWARD', rewardId: 'r-dish', at: at(3), actorId: 'debbie' }); // repeat: ignored
      const agreedEvents = r.activity.filter((e) => e.type === 'reward_agreed').length;
      const stored = 'points' in s || 'streak' in s;
      return {
        expected: [
          'Points: Syed 20, Abin 8, Debbie 0',
          'Streaks (weeks): Syed 2, Abin 0, Debbie 0',
          'Leaderboard: Syed → Abin → Debbie',
          'Cash reward "$20 cash": rejected',
          'Agreed after 2 of 3: no · after 3 of 3: yes · agreed events: 1',
          'Points stored in records: no (derived)',
        ],
        actual: [
          `Points: Syed ${pts.syed}, Abin ${pts.abin}, Debbie ${pts.debbie}`,
          `Streaks (weeks): Syed ${streaks[0]}, Abin ${streaks[1]}, Debbie ${streaks[2]}`,
          `Leaderboard: ${order.join(' → ')}`,
          `Cash reward "$20 cash": ${cash.reward === null ? 'rejected' : 'accepted'}`,
          `Agreed after 2 of 3: ${partial ? 'yes' : 'no'} · after 3 of 3: ${isRewardAgreed(r.reward) ? 'yes' : 'no'} · agreed events: ${agreedEvents}`,
          `Points stored in records: ${stored ? 'yes' : 'no (derived)'}`,
        ],
        pass:
          pts.syed === 20 &&
          pts.abin === 8 &&
          pts.debbie === 0 &&
          streaks.join() === '2,0,0' &&
          order.join() === 'Syed,Abin,Debbie' &&
          cash.reward === null &&
          !partial &&
          isRewardAgreed(r.reward) &&
          agreedEvents === 1 &&
          !stored,
      };
    },
  );
}

export const CHECK_DEFINITIONS: (() => CheckResult)[] = [
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
  scenarioE,
  scenarioF,
  scenarioG,
  checkPerspective,
  checkLanguage,
  checkInputValidation,
  checkDoubleSubmit,
  checkZeroSumStress,
  checkGamification,
];

export interface ValidationReport {
  generatedAt: string;
  environment: string;
  passed: number;
  total: number;
  results: CheckResult[];
}

export function runAllChecks(now = new Date()): ValidationReport {
  n = 0;
  const results = CHECK_DEFINITIONS.map((fn) => fn());
  return {
    generatedAt: now.toISOString(),
    environment: 'Room Sync local interactive PoC – checks run in isolated in-memory state',
    passed: results.filter((r) => r.pass).length,
    total: results.length,
    results,
  };
}

export function reportToText(r: ValidationReport): string {
  const lines = [
    'Room Sync PoC – validation results',
    `Generated: ${r.generatedAt}`,
    `Environment: ${r.environment}`,
    `Result: ${r.passed}/${r.total} checks passed`,
    '',
  ];
  for (const c of r.results) {
    lines.push(`[${c.pass ? 'PASS' : 'FAIL'}] ${c.id} – ${c.title} (${c.requirements.join(', ')})`);
    lines.push(`  Setup: ${c.setup}`);
    c.expected.forEach((e, i) => {
      lines.push(`  Expected: ${e}`);
      if (c.actual[i] !== undefined) lines.push(`  Actual:   ${c.actual[i]}`);
    });
    c.actual.slice(c.expected.length).forEach((a) => lines.push(`  Actual:   ${a}`));
    if (c.error) lines.push(`  Error: ${c.error}`);
    lines.push('');
  }
  return lines.join('\n');
}

const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? '' : 's'}`;

/** Read-only check of the live demo: is what's in localStorage identical to what's on screen? */
export function liveStorageCheck(live: AppState, raw: string | null): { pass: boolean; summary: string } {
  if (raw === null) return { pass: false, summary: 'No saved record found under ' + STORAGE_KEY };
  const store = new MemoryStore();
  store.setItem(STORAGE_KEY, raw);
  const loaded = loadState(store);
  if (loaded.status !== 'ok') return { pass: false, summary: `Saved record could not be read (${loaded.status})` };
  const same = JSON.stringify(loaded.state) === JSON.stringify(live);
  const b = balancesOf(loaded.state.data);
  return {
    pass: same && householdTotal(b) === 0,
    summary: same
      ? `Saved record matches the live demo: ${plural(loaded.state.data.expenses.length, 'expense')}, ${plural(loaded.state.data.settlements.length, 'settle-up')}, week ${loaded.state.data.currentWeek}, language ${loaded.state.prefs.lang.toUpperCase()}, household total ${$(householdTotal(b))}.`
      : 'Saved record differs from the live demo (a save may be pending).',
  };
}
