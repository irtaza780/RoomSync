import { RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';
import { CHORE_TITLE_MAX, rotationPreview, validateChoreDraft, type ChoreDraft } from '../domain/chores';
import { formatDayMonth, weekStart } from '../domain/dates';
import { useHousehold, usePhone, useT } from '../phone/context';
import { newId, nowOnDemoClock, useStore } from '../state/store';
import { Avatar, Button, Field, MemberPicker, Sheet, TextInput } from '../ui/primitives';

export function AddChoreSheet() {
  const tr = useT();
  const h = useHousehold();
  const { dispatch } = useStore();
  const { viewerId, closeSheet, toast } = usePhone();
  const [draft, setDraft] = useState<ChoreDraft>({ title: '', firstAssigneeId: viewerId });
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const draftId = useRef(newId('chore'));

  const v = validateChoreDraft(draft, h.data.chores);
  const errors = v.ok ? {} : v.errors;
  const preview = draft.firstAssigneeId ? rotationPreview(draft.firstAssigneeId, h.data.currentWeek, 4) : [];

  const save = () => {
    if (savingRef.current) return;
    setSubmitted(true);
    if (!v.ok) return;
    savingRef.current = true;
    setSaving(true);
    dispatch({ type: 'ADD_CHORE', id: draftId.current, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId, draft });
    toast(tr.t('choreForm.saved'));
    closeSheet();
  };

  return (
    <Sheet
      title={tr.t('choreForm.title')}
      onClose={closeSheet}
      footer={
        <Button className="w-full" onClick={save} disabled={saving} data-testid="save-chore">
          {tr.t('choreForm.save')}
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field
          label={tr.t('choreForm.name')}
          htmlFor="chore-title"
          error={(submitted || errors.title === 'duplicate') && errors.title ? tr.t(`err.chore.${errors.title}`, { max: CHORE_TITLE_MAX }) : undefined}
        >
          <TextInput
            id="chore-title"
            autoComplete="off"
            placeholder={tr.t('choreForm.placeholder')}
            value={draft.title}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
            invalid={!!((submitted || errors.title === 'duplicate') && errors.title)}
          />
        </Field>
        <Field label={tr.t('choreForm.frequency')}>
          <span className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-mustard-50 px-3 text-sm font-semibold ring-1 ring-mustard/40">
            <RefreshCw size={15} aria-hidden /> {tr.t('chores.weekly')}
          </span>
        </Field>
        <Field label={tr.t('choreForm.firstAssignee')} error={submitted && errors.assignee ? tr.t('err.chore.assignee') : undefined}>
          <MemberPicker
            label={tr.t('choreForm.firstAssignee')}
            members={h.data.members}
            value={draft.firstAssigneeId}
            onChange={(id) => setDraft((d) => ({ ...d, firstAssigneeId: id }))}
            youId={viewerId}
            youLabel={tr.t('common.you')}
          />
        </Field>
        <h3 className="mb-1.5 text-[13px] font-semibold text-ink-2">{tr.t('choreForm.preview')}</h3>
        <ol className="grid grid-cols-4 gap-1.5" data-testid="rotation-preview">
          {preview.map((p) => (
            <li key={p.week} className="flex flex-col items-center gap-1 rounded-2xl bg-cream px-1 py-2.5 text-center">
              <span className="text-[11px] font-semibold text-muted">{tr.t('common.week', { n: p.week })}</span>
              <Avatar member={h.member(p.assigneeId)} size="sm" />
              <span className="text-[12px] font-semibold">{h.member(p.assigneeId).name}</span>
              <span className="text-[10.5px] text-muted">{formatDayMonth(weekStart(p.week), tr.lang)}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-[12.5px] text-muted">{tr.t('chores.rotationHint')}</p>
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Sheet>
  );
}
