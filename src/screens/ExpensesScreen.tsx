import { Check, Handshake, Plus, Receipt } from 'lucide-react';
import { formatShortDate } from '../domain/dates';
import { householdTotal } from '../domain/expenses';
import { MEMBER_ORDER, type Expense, type Settlement } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { TransferRow, balanceSentence } from '../phone/shared';
import { Avatar, Button, EmptyState, Group, SectionTitle, balanceTone, cx } from '../ui/primitives';

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
    <div className="px-5 pb-32">
      <h1 className="mb-4 mt-2 text-[24px] font-bold tracking-tight">{tr.t('expenses.title')}</h1>

      <p className="text-[12.5px] font-medium text-muted">{tr.t('expenses.yourNet')}</p>
      <p className={cx('tabular text-[32px] font-bold leading-tight tracking-tight', balanceTone(my))} data-testid="expenses-net">
        {tr.signed(my)}
      </p>
      <p className="text-[13.5px] font-semibold">{balanceSentence(my, tr)}</p>
      <p className="mt-0.5 text-[11.5px] text-muted">{tr.t('balance.convention')}</p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" className="flex-1" onClick={() => openSheet({ kind: 'addExpense' })}>
          <Plus size={16} aria-hidden /> {tr.t('expenses.add')}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => openSheet({ kind: 'settle' })}>
          <Handshake size={16} aria-hidden /> {tr.t('expenses.settleUp')}
        </Button>
      </div>

      <SectionTitle>{tr.t('expenses.whoOwesWhom')}</SectionTitle>
      {h.transfers.length === 0 ? (
        <EmptyState icon={<Check size={17} />}>{tr.t('expenses.allSettled')}</EmptyState>
      ) : (
        <Group className="divide-y divide-line">
          {h.transfers.map((t) => (
            <TransferRow key={`${t.fromUserId}-${t.toUserId}`} t={t} onSettle={() => openSheet({ kind: 'settle', fromUserId: t.fromUserId, toUserId: t.toUserId })} />
          ))}
        </Group>
      )}

      <SectionTitle>{tr.t('expenses.householdBalances')}</SectionTitle>
      <Group className="divide-y divide-line">
        {MEMBER_ORDER.map((id) => {
          const b = h.balances[id];
          return (
            <div key={id} className="flex items-center gap-3 px-3.5 py-2.5">
              <Avatar member={h.member(id)} size="xs" />
              <span className="flex-1 text-[13.5px] font-medium">
                {h.member(id).name}
                {id === viewerId && <span className="ml-1 text-[12px] text-muted">({tr.t('common.youLower')})</span>}
              </span>
              <span className={cx('tabular text-[13.5px] font-semibold', balanceTone(b))} data-testid={`balance-${id}`}>
                {tr.signed(b)}
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between px-3.5 py-2.5 text-[12.5px]">
          <span className="text-muted">{tr.t('expenses.householdTotal')}</span>
          <span className={cx('tabular inline-flex items-center gap-1 font-semibold', total === 0 ? 'text-pine' : 'text-bad')} data-testid="household-total">
            {total === 0 && <Check size={13} strokeWidth={3} aria-label={tr.t('expenses.zeroSum')} />}
            {tr.money(total)}
          </span>
        </div>
      </Group>

      <SectionTitle>{tr.t('expenses.history')}</SectionTitle>
      {rows.length === 0 ? (
        <EmptyState icon={<Receipt size={17} />}>{tr.t('expenses.empty')}</EmptyState>
      ) : (
        <Group className="divide-y divide-line overflow-hidden">
          {rows.map((r) =>
            r.kind === 'expense' ? (
              <button
                key={r.e.id}
                type="button"
                onClick={() => openSheet({ kind: 'expense', id: r.e.id })}
                className="flex w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-cream/60"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mustard-50 text-mustard-600">
                  <Receipt size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">{r.e.title}</span>
                  <span className="block truncate text-[12px] text-muted">
                    {tr.t('expenses.paidBy', { name: h.who(r.e.payerId) })} · {formatShortDate(r.e.createdAt, tr.lang)} ·{' '}
                    {tr.t(r.e.splitType === 'equal' ? 'activity.splitEqual' : 'activity.splitCustom')}
                  </span>
                </span>
                <span className="text-right">
                  <span className="tabular block text-[14px] font-semibold">{tr.money(r.e.totalCents)}</span>
                  <span className="tabular block text-[11px] text-muted">
                    {tr.t('expenses.yourShare', { amount: tr.money(r.e.splits.find((s) => s.userId === viewerId)?.owedCents ?? 0) })}
                  </span>
                </span>
              </button>
            ) : (
              <div key={r.s.id} className="flex items-center gap-3 px-3.5 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pine-50 text-pine">
                  <Handshake size={16} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-semibold">
                    {tr.t('expenses.settlementRow', { from: h.who(r.s.fromUserId), to: h.who(r.s.toUserId, false) })}
                  </span>
                  <span className="block truncate text-[12px] text-muted">
                    {tr.t('expenses.settlementSub')} · {formatShortDate(r.s.settledAt, tr.lang)}
                  </span>
                </span>
                <span className="tabular text-[14px] font-semibold">{tr.money(r.s.amountCents)}</span>
              </div>
            ),
          )}
        </Group>
      )}
    </div>
  );
}
