import { CircleCheck, Handshake, Plus, Receipt } from 'lucide-react';
import { formatShortDate } from '../domain/dates';
import { householdTotal } from '../domain/expenses';
import { MEMBER_ORDER, type Expense, type Settlement } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { TransferRow, balanceSentence } from '../phone/shared';
import { Avatar, Button, Card, EmptyState, SectionTitle, balanceTone, cx } from '../ui/primitives';

type Row = { kind: 'expense'; at: string; e: Expense } | { kind: 'settlement'; at: string; s: Settlement };

export function ExpensesScreen() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, openSheet } = usePhone();
  const my = h.balances[viewerId];
  const total = householdTotal(h.balances);

  const rows: Row[] = [
    ...h.data.expenses.map((e) => ({ kind: 'expense' as const, at: e.createdAt, e })),
    ...h.data.settlements.map((s) => ({ kind: 'settlement' as const, at: s.settledAt, s })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  return (
    <div className="px-4 pb-6">
      <h1 className="mb-3 mt-1 px-1 text-2xl font-extrabold tracking-tight">{tr.t('expenses.title')}</h1>

      <Card>
        <p className="text-[13px] font-semibold text-muted">{tr.t('expenses.yourNet')}</p>
        <p className={cx('tabular mt-0.5 text-3xl font-extrabold tracking-tight', balanceTone(my))} data-testid="expenses-net">
          {tr.signed(my)}
        </p>
        <p className="text-sm font-semibold">{balanceSentence(my, tr)}</p>
        <p className="mt-1 text-[12px] text-muted">{tr.t('balance.convention')}</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button onClick={() => openSheet({ kind: 'addExpense' })}>
            <Plus size={18} aria-hidden /> {tr.t('expenses.add')}
          </Button>
          <Button variant="secondary" onClick={() => openSheet({ kind: 'settle' })}>
            <Handshake size={18} aria-hidden /> {tr.t('expenses.settleUp')}
          </Button>
        </div>
      </Card>

      <SectionTitle>{tr.t('expenses.whoOwesWhom')}</SectionTitle>
      <Card className="py-1.5">
        {h.transfers.length === 0 ? (
          <p className="flex items-center gap-2 py-3 text-sm font-medium text-good">
            <CircleCheck size={18} aria-hidden /> {tr.t('expenses.allSettled')}
          </p>
        ) : (
          <div className="divide-y divide-line">
            {h.transfers.map((t) => (
              <TransferRow
                key={`${t.fromUserId}-${t.toUserId}`}
                t={t}
                onSettle={() => openSheet({ kind: 'settle', fromUserId: t.fromUserId, toUserId: t.toUserId })}
              />
            ))}
          </div>
        )}
      </Card>

      <SectionTitle>{tr.t('expenses.householdBalances')}</SectionTitle>
      <Card className="py-2">
        <ul className="divide-y divide-line">
          {MEMBER_ORDER.map((id) => {
            const b = h.balances[id];
            return (
              <li key={id} className="flex items-center gap-3 py-2.5">
                <Avatar member={h.member(id)} size="sm" />
                <span className="flex-1 text-sm font-semibold">
                  {h.member(id).name}
                  {id === viewerId && <span className="ml-1.5 text-[12px] font-medium text-muted">({tr.t('common.youLower')})</span>}
                </span>
                <span className={cx('tabular text-sm font-bold', balanceTone(b))} data-testid={`balance-${id}`}>
                  {tr.signed(b)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-1 flex items-center justify-between border-t border-dashed border-line pt-2.5 text-[13px]">
          <span className="font-semibold text-muted">{tr.t('expenses.householdTotal')}</span>
          <span className={cx('tabular inline-flex items-center gap-1 font-bold', total === 0 ? 'text-good' : 'text-bad')} data-testid="household-total">
            {total === 0 && <CircleCheck size={14} aria-hidden />}
            {tr.money(total)}
          </span>
        </div>
        {total === 0 && <p className="text-right text-[11.5px] text-muted">{tr.t('expenses.zeroSum')}</p>}
      </Card>

      <SectionTitle>{tr.t('expenses.history')}</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt size={20} />}>{tr.t('expenses.empty')}</EmptyState>
      ) : (
        <Card className="px-2 py-1">
          <ul className="divide-y divide-line">
            {rows.map((r) =>
              r.kind === 'expense' ? (
                <li key={r.e.id}>
                  <button
                    type="button"
                    onClick={() => openSheet({ kind: 'expense', id: r.e.id })}
                    className="flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-cream/70"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-mustard-100">
                      <Receipt size={18} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{r.e.title}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {tr.t('expenses.paidBy', { name: h.who(r.e.payerId) })} · {formatShortDate(r.e.createdAt, tr.lang)}
                      </span>
                      <span className="block truncate text-[12px] text-muted">
                        {tr.t(r.e.splitType === 'equal' ? 'expenses.splitEqual' : 'expenses.splitCustom')}
                      </span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block text-[15px] font-bold">{tr.money(r.e.totalCents)}</span>
                      <span className="tabular block text-[11.5px] text-muted">
                        {tr.t('expenses.yourShare', { amount: tr.money(r.e.splits.find((s) => s.userId === viewerId)?.owedCents ?? 0) })}
                      </span>
                    </span>
                  </button>
                </li>
              ) : (
                <li key={r.s.id} className="flex items-center gap-3 px-2 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-good-50 text-good">
                    <Handshake size={18} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">
                      {tr.t('expenses.settlementRow', { from: h.who(r.s.fromUserId), to: h.who(r.s.toUserId, false) })}
                    </span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {tr.t('expenses.settlementSub')} · {formatShortDate(r.s.settledAt, tr.lang)}
                    </span>
                  </span>
                  <span className="tabular text-[15px] font-bold">{tr.money(r.s.amountCents)}</span>
                </li>
              ),
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}
