import { CircleCheck, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import {
  allocationSummary,
  emptyExpenseDraft,
  equalSplit,
  TITLE_MAX,
  validateExpenseDraft,
  type ExpenseDraft,
} from '../domain/expenses';
import { parseCents } from '../domain/money';
import { MEMBER_ORDER, type MemberId, type SplitType } from '../domain/types';
import { listNames } from '../i18n';
import { useHousehold, usePhone, useT } from '../phone/context';
import { newId, nowOnDemoClock, useStore } from '../state/store';
import { Avatar, Button, Field, MemberPicker, Segmented, Sheet, TextInput, cx } from '../ui/primitives';
import { currencyAffix, moneyError } from './messages';

export function AddExpenseSheet() {
  const tr = useT();
  const h = useHousehold();
  const { dispatch } = useStore();
  const { viewerId, closeSheet, toast } = usePhone();
  const [draft, setDraft] = useState<ExpenseDraft>(() => emptyExpenseDraft(viewerId));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const draftId = useRef(newId('exp')); // idempotency key: repeated clicks can never create two expenses

  const v = validateExpenseDraft(draft);
  const errors = v.ok ? {} : v.errors;
  const show = (k: string) => submitted || touched[k];
  const amount = parseCents(draft.amount);
  const alloc = allocationSummary(draft);
  const affix = currencyAffix(tr.lang);

  const set = <K extends keyof ExpenseDraft>(k: K, val: ExpenseDraft[K]) => setDraft((d) => ({ ...d, [k]: val }));
  const setShare = (m: MemberId, val: string) => setDraft((d) => ({ ...d, customShares: { ...d.customShares, [m]: val } }));
  const blur = (k: string) => () => setTouched((t) => ({ ...t, [k]: true }));

  const save = () => {
    if (savingRef.current) return;
    setSubmitted(true);
    if (!v.ok) return; // values stay as entered; inline feedback explains what to fix
    savingRef.current = true;
    setSaving(true);
    dispatch({ type: 'ADD_EXPENSE', id: draftId.current, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId, draft });
    toast(tr.t('expenseForm.saved'));
    closeSheet();
  };

  const equalInfo = amount.ok ? equalSplit(amount.cents) : null;

  return (
    <Sheet
      title={tr.t('expenseForm.title')}
      onClose={closeSheet}
      footer={
        <>
          {submitted && !v.ok && (
            <p className="mb-2 text-center text-[13px] font-medium text-bad" data-testid="save-blocked">
              {errors.allocation && Object.keys(errors).length === 1 && alloc.totalCents !== null
                ? tr.t(errors.allocation.kind === 'short' ? 'err.alloc.short' : 'err.alloc.over', {
                    amount: tr.money(errors.allocation.diffCents),
                    total: tr.money(alloc.totalCents),
                  })
                : tr.t('expenseForm.fixErrors')}
            </p>
          )}
          <Button className="w-full" onClick={save} disabled={saving} data-testid="save-expense">
            {saving ? tr.t('expenseForm.saving') : tr.t('expenseForm.save')}
          </Button>
        </>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label={tr.t('expenseForm.description')} htmlFor="exp-title" error={show('title') && errors.title ? tr.t(`err.title.${errors.title}`, { max: TITLE_MAX }) : undefined}>
          <TextInput
            id="exp-title"
            autoComplete="off"
            placeholder={tr.t('expenseForm.descriptionPlaceholder')}
            value={draft.title}
            maxLength={TITLE_MAX + 20}
            onChange={(e) => set('title', e.target.value)}
            onBlur={blur('title')}
            invalid={!!(show('title') && errors.title)}
          />
        </Field>

        <Field label={tr.t('expenseForm.amount')} htmlFor="exp-amount" error={show('amount') ? moneyError(errors.amount, tr) : undefined}>
          <TextInput
            id="exp-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder={tr.lang === 'fr' ? '0,00' : '0.00'}
            value={draft.amount}
            onChange={(e) => set('amount', e.target.value)}
            onBlur={blur('amount')}
            invalid={!!(show('amount') && errors.amount)}
            {...affix}
          />
        </Field>

        <Field label={tr.t('expenseForm.payer')} error={show('payer') && errors.payer ? tr.t('err.payer.required') : undefined}>
          <MemberPicker
            label={tr.t('expenseForm.payer')}
            members={h.data.members}
            value={draft.payerId}
            onChange={(id) => set('payerId', id)}
            youId={viewerId}
            youLabel={tr.t('common.you')}
          />
        </Field>

        <Field label={tr.t('expenseForm.split')}>
          <Segmented<SplitType>
            label={tr.t('expenseForm.split')}
            value={draft.splitType}
            onChange={(s) => set('splitType', s)}
            options={[
              { value: 'equal', label: tr.t('expenseForm.equal') },
              { value: 'custom', label: tr.t('expenseForm.custom') },
            ]}
          />
        </Field>

        {draft.splitType === 'equal' ? (
          <div className="rounded-2xl bg-cream p-3.5" data-testid="equal-preview">
            {equalInfo ? (
              <>
                <ul className="space-y-1.5">
                  {equalInfo.splits.map((s) => (
                    <li key={s.userId} className="flex items-center gap-2 text-sm">
                      <Avatar member={h.member(s.userId)} size="xs" />
                      <span className="flex-1 font-medium">{h.member(s.userId).name}</span>
                      {equalInfo.extraCentTo.includes(s.userId) && (
                        <span className="rounded-full bg-mustard-50 px-1.5 text-[11px] font-bold text-mustard-600">+1¢</span>
                      )}
                      <span className="tabular font-bold">{tr.money(s.owedCents)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2.5 flex gap-1.5 border-t border-line pt-2.5 text-[12.5px] text-ink-2">
                  <Info size={14} className="mt-0.5 shrink-0 text-muted" aria-hidden />
                  <span>
                    {equalInfo.remainderCents === 0
                      ? tr.t('expenseForm.equalExact', { total: tr.money(amount.ok ? amount.cents : 0), each: tr.money(equalInfo.baseCents) })
                      : tr.tp('expenseForm.equalRemainder', equalInfo.remainderCents, {
                          total: tr.money(amount.ok ? amount.cents : 0),
                          base: tr.money(equalInfo.baseCents),
                          names: listNames(equalInfo.extraCentTo.map((m) => h.member(m).name), tr.lang),
                        })}{' '}
                    {equalInfo.remainderCents > 0 && tr.t('expenseForm.remainderRule')} {tr.t('expenseForm.includesPayer')}
                  </span>
                </p>
              </>
            ) : (
              <p className="text-[13px] text-muted">{tr.t('expenseForm.enterAmount')}</p>
            )}
          </div>
        ) : (
          <div data-testid="custom-split">
            <p className="mb-1.5 text-[12.5px] font-semibold text-muted">{tr.t('expenseForm.shares')}</p>
            <div className="space-y-2">
              {MEMBER_ORDER.map((m) => {
                const err = show(`share-${m}`) ? moneyError(errors.shares?.[m], tr) : undefined;
                return (
                  <div key={m}>
                    <div className="flex items-center gap-2.5">
                      <label htmlFor={`share-${m}`} className="flex w-24 items-center gap-2 text-sm font-semibold">
                        <Avatar member={h.member(m)} size="xs" /> {h.member(m).name}
                      </label>
                      <TextInput
                        id={`share-${m}`}
                        className="flex-1"
                        inputMode="decimal"
                        autoComplete="off"
                        placeholder={tr.lang === 'fr' ? '0,00' : '0.00'}
                        value={draft.customShares[m]}
                        onChange={(e) => setShare(m, e.target.value)}
                        onBlur={blur(`share-${m}`)}
                        invalid={!!err}
                        {...affix}
                      />
                    </div>
                    {err && (
                      <p role="alert" className="ml-[106px] mt-1 text-[12.5px] font-medium text-bad">
                        {err}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            <AllocationMeter total={alloc.totalCents} allocated={alloc.allocatedCents} remaining={alloc.remainingCents} />
            {alloc.totalCents !== null && !alloc.hasShareErrors && (
              <p
                role={submitted && errors.allocation ? 'alert' : undefined}
                data-testid="allocation-feedback"
                className={cx(
                  'mt-2 flex items-start gap-1.5 text-[13px] font-medium',
                  errors.allocation ? (submitted ? 'text-bad' : 'text-ink-2') : 'text-pine',
                )}
              >
                {!errors.allocation && <CircleCheck size={15} className="mt-0.5 shrink-0" aria-hidden />}
                {errors.allocation
                  ? tr.t(errors.allocation.kind === 'short' ? 'err.alloc.short' : 'err.alloc.over', {
                      amount: tr.money(errors.allocation.diffCents),
                      total: tr.money(alloc.totalCents),
                    })
                  : tr.t('expenseForm.balanced')}
              </p>
            )}
          </div>
        )}
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}

function AllocationMeter({ total, allocated, remaining }: { total: number | null; allocated: number; remaining: number | null }) {
  const tr = useT();
  const pct = total ? Math.min(100, Math.round((allocated / total) * 100)) : 0;
  const over = remaining !== null && remaining < 0;
  return (
    <div className="mt-3 rounded-2xl bg-cream/70 p-3">
      <div className="grid grid-cols-3 text-center">
        {[
          { label: tr.t('expenseForm.total'), value: total === null ? '—' : tr.money(total) },
          { label: tr.t('expenseForm.allocated'), value: tr.money(allocated) },
          { label: tr.t('expenseForm.remaining'), value: remaining === null ? '—' : tr.money(remaining), strong: true },
        ].map((c) => (
          <div key={c.label}>
            <p className="text-[11px] font-medium text-muted">{c.label}</p>
            <p className={cx('tabular text-[15px] font-bold', c.strong && over && 'text-bad', c.strong && remaining === 0 && 'text-pine')}>
              {c.value}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
        <div className={cx('h-full rounded-full transition-all', over ? 'bg-bad' : remaining === 0 ? 'bg-pine' : 'bg-mustard')} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
