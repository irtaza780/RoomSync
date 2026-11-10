import { ArrowRight, Info } from 'lucide-react';
import { useRef, useState } from 'react';
import { centsToInput } from '../domain/money';
import { outstandingBetween, validateSettlementDraft, type SettlementDraft } from '../domain/expenses';
import type { MemberId } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { newId, nowOnDemoClock, useStore } from '../state/store';
import { Avatar, Button, Field, MemberPicker, Sheet, TextInput, cx } from '../ui/primitives';
import { currencyAffix, moneyError } from './messages';

export function SettleUpSheet({ fromUserId, toUserId }: { fromUserId?: MemberId; toUserId?: MemberId }) {
  const tr = useT();
  const h = useHousehold();
  const { dispatch } = useStore();
  const { viewerId, closeSheet, toast } = usePhone();

  // Default: the first outstanding payment involving the viewer, else the first one overall.
  const [draft, setDraft] = useState<SettlementDraft>(() => {
    if (fromUserId && toUserId)
      return { fromUserId, toUserId, amount: centsToInput(outstandingBetween(h.balances, fromUserId, toUserId), tr.lang) };
    const t = h.transfers.find((x) => x.fromUserId === viewerId || x.toUserId === viewerId) ?? h.transfers[0];
    return t
      ? { fromUserId: t.fromUserId, toUserId: t.toUserId, amount: centsToInput(t.amountCents, tr.lang) }
      : { fromUserId: viewerId, toUserId: '', amount: '' };
  });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const draftId = useRef(newId('set'));

  const v = validateSettlementDraft(draft, h.balances);
  const errors = v.ok ? {} : v.errors;
  const max = draft.fromUserId && draft.toUserId && draft.fromUserId !== draft.toUserId ? outstandingBetween(h.balances, draft.fromUserId, draft.toUserId) : null;
  const pairError = errors.amount === 'noOutstanding'; // shown immediately: picking a pair with nothing owed

  const amountError = (() => {
    if (!errors.amount) return undefined;
    if (errors.amount === 'noOutstanding')
      return tr.t('err.settle.noOutstanding', { from: h.who(draft.fromUserId as MemberId), to: h.who(draft.toUserId as MemberId, false) });
    if (!submitted) return undefined;
    if (errors.amount === 'exceedsOutstanding') return tr.t('err.settle.exceeds', { amount: tr.money(errors.maxCents ?? 0) });
    return moneyError(errors.amount, tr);
  })();

  const save = () => {
    if (savingRef.current) return;
    setSubmitted(true);
    if (!v.ok) return;
    savingRef.current = true;
    setSaving(true);
    dispatch({ type: 'ADD_SETTLEMENT', id: draftId.current, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId, draft });
    toast(tr.t('settle.saved'));
    closeSheet();
  };

  return (
    <Sheet
      title={tr.t('settle.title')}
      onClose={closeSheet}
      footer={
        <Button className="w-full" onClick={save} disabled={saving || h.transfers.length === 0} data-testid="save-settlement">
          {tr.t('settle.save')}
        </Button>
      }
    >
      <p className="mb-4 flex gap-2 rounded-2xl bg-cream p-3 text-[13px] text-ink-2">
        <Info size={16} className="mt-0.5 shrink-0 text-muted" aria-hidden />
        {tr.t('settle.explain')}
      </p>

      <h3 className="mb-1.5 text-[13px] font-semibold text-ink-2">{tr.t('settle.suggested')}</h3>
      {h.transfers.length === 0 ? (
        <p className="mb-4 rounded-2xl bg-good-50 p-3 text-sm font-medium text-good">{tr.t('settle.none')}</p>
      ) : (
        <div className="mb-4 space-y-1.5">
          {h.transfers.map((t) => {
            const active = draft.fromUserId === t.fromUserId && draft.toUserId === t.toUserId;
            return (
              <button
                key={`${t.fromUserId}-${t.toUserId}`}
                type="button"
                aria-pressed={active}
                onClick={() => setDraft({ fromUserId: t.fromUserId, toUserId: t.toUserId, amount: centsToInput(t.amountCents, tr.lang) })}
                className={cx(
                  'flex min-h-12 w-full items-center gap-2 rounded-2xl px-3 text-left text-sm ring-1 transition',
                  active ? 'bg-mustard-50 ring-2 ring-mustard' : 'bg-surface ring-line hover:ring-mustard/50',
                )}
              >
                <Avatar member={h.member(t.fromUserId)} size="xs" />
                <span className="font-semibold">{h.who(t.fromUserId)}</span>
                <ArrowRight size={14} className="text-muted" aria-hidden />
                <Avatar member={h.member(t.toUserId)} size="xs" />
                <span className="flex-1 font-semibold">{h.who(t.toUserId)}</span>
                <span className="tabular font-bold">{tr.money(t.amountCents)}</span>
              </button>
            );
          })}
        </div>
      )}

      {h.transfers.length > 0 && (
        <>
          <Field label={tr.t('settle.from')} error={submitted && errors.from ? tr.t('err.settle.from') : undefined}>
            <MemberPicker
              label={tr.t('settle.from')}
              members={h.data.members}
              value={draft.fromUserId}
              onChange={(id) => setDraft((d) => ({ ...d, fromUserId: id, toUserId: d.toUserId === id ? '' : d.toUserId }))}
              youId={viewerId}
              youLabel={tr.t('common.you')}
            />
          </Field>
          <Field
            label={tr.t('settle.to')}
            error={(submitted && errors.to ? tr.t(errors.to === 'same' ? 'err.settle.same' : 'err.settle.to') : undefined) ?? undefined}
          >
            <MemberPicker
              label={tr.t('settle.to')}
              members={h.data.members}
              value={draft.toUserId}
              onChange={(id) => setDraft((d) => ({ ...d, toUserId: id }))}
              youId={viewerId}
              youLabel={tr.t('common.you')}
              disabledId={draft.fromUserId || undefined}
            />
          </Field>
          <Field
            label={tr.t('settle.amount')}
            htmlFor="settle-amount"
            error={amountError}
            hint={
              max !== null && max > 0 ? (
                <span className="flex items-center justify-between">
                  {tr.t('settle.outstanding', { amount: tr.money(max) })}
                  <button
                    type="button"
                    className="font-semibold text-mustard-600 hover:underline"
                    onClick={() => setDraft((d) => ({ ...d, amount: centsToInput(max, tr.lang) }))}
                  >
                    {tr.t('settle.useFull')}
                  </button>
                </span>
              ) : undefined
            }
          >
            <TextInput
              id="settle-amount"
              inputMode="decimal"
              autoComplete="off"
              value={draft.amount}
              onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              invalid={!!amountError}
              disabled={pairError}
              {...currencyAffix(tr.lang)}
            />
          </Field>
        </>
      )}
    </Sheet>
  );
}
