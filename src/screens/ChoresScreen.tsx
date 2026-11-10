import { ListChecks, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { assignmentStatus, sortAssignments } from '../domain/chores';
import { formatWeekRange } from '../domain/dates';
import { MEMBER_ORDER } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { ChoreRow } from '../phone/shared';
import { Avatar, Button, EmptyState, SectionTitle } from '../ui/primitives';

export function ChoresScreen() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, openSheet } = usePhone();
  const [showHistory, setShowHistory] = useState(false);
  const week = h.data.currentWeek;

  const thisWeek = sortAssignments(h.data.assignments.filter((a) => a.week === week), h.today);
  const mine = thisWeek.filter((a) => a.assigneeId === viewerId);
  const overdue = sortAssignments(
    h.data.assignments.filter((a) => a.week < week && assignmentStatus(a, h.today) === 'overdue'),
    h.today,
  );
  const history = h.data.assignments
    .filter((a) => a.week < week && a.status === 'done')
    .sort((a, b) => b.week - a.week || a.choreId.localeCompare(b.choreId));

  return (
    <div className="px-4 pb-6">
      <div className="mb-3 mt-1 flex items-end justify-between px-1">
        <div>
          <p className="text-[13px] font-medium text-muted">{tr.t('chores.weekLabel', { n: week, range: formatWeekRange(week, tr.lang) })}</p>
          <h1 className="text-2xl font-extrabold tracking-tight">{tr.t('chores.title')}</h1>
        </div>
        <Button className="min-h-10 px-3" onClick={() => openSheet({ kind: 'addChore' })}>
          <Plus size={18} aria-hidden /> {tr.t('chores.add')}
        </Button>
      </div>

      {/* Rotation rule explainer */}
      <div className="flex items-start gap-3 rounded-2xl bg-mustard-50 p-3.5 ring-1 ring-mustard/30">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-mustard text-ink">
          <RefreshCw size={17} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1 text-[13px] font-bold">
            {tr.t('chores.weekly')}:
            {[...MEMBER_ORDER, MEMBER_ORDER[0]].map((id, i) => (
              <span key={i} className="inline-flex items-center gap-1">
                {i > 0 && <span className="text-muted">→</span>}
                <Avatar member={h.member(id)} size="xs" />
              </span>
            ))}
          </p>
          <p className="mt-0.5 text-[12.5px] text-ink-2">{tr.t('chores.rotationHint')}</p>
        </div>
      </div>

      {h.data.chores.length === 0 ? (
        <div className="mt-5">
          <EmptyState icon={<ListChecks size={20} />}>{tr.t('chores.empty')}</EmptyState>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <SectionTitle>
                <span className="text-bad">{tr.t('chores.overdue')}</span>
              </SectionTitle>
              <div className="space-y-2">
                {overdue.map((a) => (
                  <ChoreRow key={a.id} a={a} showNext={false} />
                ))}
              </div>
            </>
          )}

          <SectionTitle>{tr.t('chores.yours')}</SectionTitle>
          <div className="space-y-2">
            {mine.length === 0 ? (
              <EmptyState icon={<Sparkles size={20} />}>{tr.t('chores.noneYours')}</EmptyState>
            ) : (
              mine.map((a) => <ChoreRow key={a.id} a={a} />)
            )}
          </div>

          <SectionTitle>{tr.t('chores.household')}</SectionTitle>
          <div className="space-y-2">
            {thisWeek
              .filter((a) => a.assigneeId !== viewerId)
              .map((a) => (
                <ChoreRow key={a.id} a={a} />
              ))}
          </div>

          {history.length > 0 && (
            <>
              <SectionTitle
                action={
                  <button
                    type="button"
                    aria-expanded={showHistory}
                    onClick={() => setShowHistory((v) => !v)}
                    className="min-h-8 rounded-lg px-1 text-[13px] font-semibold text-mustard-600 hover:underline"
                  >
                    {showHistory ? '−' : '+'} {history.length}
                  </button>
                }
              >
                {tr.t('chores.history')}
              </SectionTitle>
              {showHistory && (
                <div className="space-y-2">
                  {history.map((a) => (
                    <div key={a.id}>
                      <p className="mb-1 px-1 text-[11.5px] font-semibold text-muted">{tr.t('common.week', { n: a.week })}</p>
                      <ChoreRow a={a} showNext={false} />
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
