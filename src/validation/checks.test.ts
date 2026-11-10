import { describe, expect, it } from 'vitest';
import { equalSplit, householdTotal, balancesOf, suggestTransfers } from '../domain/expenses';
import { parseCents, formatCents } from '../domain/money';
import { buildScenario } from '../state/seed';
import { runAllChecks, reportToText } from './checks';

describe('validation scenarios (same functions as the in-app validation panel)', () => {
  const report = runAllChecks(new Date('2026-11-09T12:00:00Z'));
  for (const r of report.results) {
    it(`${r.id} – ${r.title}`, () => {
      expect(r.error, r.error).toBeUndefined();
      expect(r.pass, reportToText({ ...report, results: [r] })).toBe(true);
    });
  }
});

describe('money helpers', () => {
  it('parses strings without floating-point multiplication', () => {
    expect(parseCents('0.29')).toEqual({ ok: true, cents: 29 });
    expect(parseCents('19.99')).toEqual({ ok: true, cents: 1999 });
    expect(parseCents('$ 1 000')).toEqual({ ok: true, cents: 100000 });
    expect(parseCents('.5')).toEqual({ ok: true, cents: 50 });
    expect(parseCents('7.')).toEqual({ ok: true, cents: 700 });
    expect(parseCents('1e3')).toEqual({ ok: false, error: 'invalid' });
    expect(parseCents('1,234.00')).toEqual({ ok: false, error: 'invalid' });
  });
  it('formats CAD per language', () => {
    expect(formatCents(-2000, 'en', { signed: true })).toBe('−$20.00');
    expect(formatCents(666, 'en', { signed: true })).toBe('+$6.66');
    expect(formatCents(4000, 'fr').replace(/\s/g, ' ')).toBe('40,00 $');
  });
  it('splits remainder cents in stable order', () => {
    expect(equalSplit(1001).splits.map((s) => s.owedCents)).toEqual([334, 334, 333]);
    expect(equalSplit(2).splits.map((s) => s.owedCents)).toEqual([1, 1, 0]);
  });
});

describe('seeded demos', () => {
  it('populated demo balances are derived and sum to zero', () => {
    const d = buildScenario('populated');
    const b = balancesOf(d);
    expect(householdTotal(b)).toBe(0);
    expect(b).toEqual({ syed: 6119, abin: -849, debbie: -5270 });
    expect(suggestTransfers(b)).toEqual([
      { fromUserId: 'debbie', toUserId: 'syed', amountCents: 5270 },
      { fromUserId: 'abin', toUserId: 'syed', amountCents: 849 },
    ]);
    expect(d.currentWeek).toBe(2);
    expect(d.settlements).toHaveLength(1);
    expect(d.reward?.agreedBy).toEqual(['abin', 'debbie']);
  });
  it('clean scenario has zero balances', () => {
    const d = buildScenario('clean');
    expect(balancesOf(d)).toEqual({ syed: 0, abin: 0, debbie: 0 });
    expect(d.assignments.map((a) => a.assigneeId)).toEqual(['syed', 'abin', 'debbie']);
  });
});
