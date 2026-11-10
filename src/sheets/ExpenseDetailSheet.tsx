import { CircleCheck, Info, Receipt } from 'lucide-react';
import { formatDateTime } from '../domain/dates';
import { equalSplit, expenseEffect } from '../domain/expenses';
import { sumCents } from '../domain/money';
import { listNames } from '../i18n';
import { useHousehold, usePhone, useT } from '../phone/context';
import { Avatar, Sheet, balanceTone, cx } from '../ui/primitives';

export function ExpenseDetailSheet({ id }: { id: string }) {
  const tr = useT();
  const h = useHousehold();
  const { closeSheet, viewerId } = usePhone();
  const e = h.data.expenses.find((x) => x.id === id);
  if (!e) return null;
  const effect = expenseEffect(e);
  const eq = e.splitType === 'equal' ? equalSplit(e.totalCents) : null;

  const rows: [string, string][] = [
    [tr.t('detail.paidBy'), h.who(e.payerId)],
    [tr.t('detail.date'), formatDateTime(e.createdAt, tr.lang)],
    [tr.t('detail.split'), tr.t(e.splitType === 'equal' ? 'expenses.splitEqual' : 'expenses.splitCustom')],
  ];

  return (
    <Sheet title={tr.t('detail.title')} onClose={closeSheet}>
      <div className="flex items-center gap-3 rounded-[20px] bg-cream p-4">
        <span className="grid size-11 place-items-center rounded-full bg-mustard-50 text-mustard-600">
          <Receipt size={20} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-bold">{e.title}</p>
          <p className="tabular text-[24px] font-bold tracking-tight">{tr.money(e.totalCents)}</p>
        </div>
      </div>

      <dl className="mt-3 divide-y divide-line rounded-[20px] px-1">
        {rows.map(([k, val]) => (
          <div key={k} className="flex justify-between gap-4 py-2.5 text-sm">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-semibold">{val}</dd>
          </div>
        ))}
      </dl>

      <h3 className="mb-2 mt-5 text-[13px] font-semibold text-muted">{tr.t('detail.shares')}</h3>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[11.5px] uppercase tracking-wide text-muted">
            <th className="pb-1.5 text-left font-semibold" />
            <th className="pb-1.5 text-right font-semibold">{tr.t('detail.share')}</th>
            <th className="pb-1.5 text-right font-semibold">{tr.t('detail.effect')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {e.splits.map((s) => (
            <tr key={s.userId} className={cx(s.userId === viewerId && 'bg-pine-50/60')}>
              <td className="py-2.5">
                <span className="flex items-center gap-2 font-semibold">
                  <Avatar member={h.member(s.userId)} size="xs" /> {h.who(s.userId)}
                </span>
              </td>
              <td className="tabular py-2.5 text-right font-semibold">{tr.money(s.owedCents)}</td>
              <td className={cx('tabular py-2.5 text-right font-bold', balanceTone(effect[s.userId]))}>{tr.signed(effect[s.userId])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-pine">
        <CircleCheck size={14} aria-hidden /> {tr.t('detail.sumCheck', { total: tr.money(sumCents(e.splits.map((s) => s.owedCents))) })}
      </p>
      {eq && eq.remainderCents > 0 && (
        <p className="mt-2 flex gap-1.5 rounded-2xl bg-cream p-3 text-[12.5px] text-ink-2">
          <Info size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden />
          <span>
            {tr.tp('expenseForm.equalRemainder', eq.remainderCents, {
              total: tr.money(e.totalCents),
              base: tr.money(eq.baseCents),
              names: listNames(eq.extraCentTo.map((m) => h.member(m).name), tr.lang),
            })}{' '}
            {tr.t('expenseForm.remainderRule')}
          </span>
        </p>
      )}
      <p className="mb-2 mt-4 text-center text-[12px] text-muted">{tr.t('detail.recordedBy', { name: h.who(e.createdBy) })}</p>
    </Sheet>
  );
}
