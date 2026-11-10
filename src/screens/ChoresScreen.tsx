import { ChevronDown, ListChecks, Plus, RefreshCw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { assignmentStatus, sortAssignments } from '../domain/chores';
import { formatWeekRange } from '../domain/dates';
import { MEMBER_ORDER } from '../domain/types';
import { useHousehold, usePhone, useT } from '../phone/context';
import { ChoreRow, PointsPill } from '../phone/shared';
import { Avatar, Button, EmptyState, Group, SectionTitle, cx } from '../ui/primitives';

export function ChoresScreen() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, openSheet } = usePhone();
  const [showHistory, setShowHistory] = useState(false);
  const week = h.data.currentWeek;

  const thisWeek = sortAssignments(h.data.assignments.filter((a) => a.week === week), h.today);
  const mine = thisWeek.filter((a) => a.assigneeId === viewerId);
  const others = thisWeek.filter((a) => a.assigneeId !== viewerId);
  const overdue = sortAssignments(
    h.data.assignments.filter((a) => a.week < week && assignmentStatus(a, h.today) === 'overdue'),
    h.today,
  );
  const history = h.data.assignments.filter((a) => a.week < week && a.status === 'done').sort((a, b) => b.week - a.week || a.choreId.localeCompare(b.choreId));

  return (
    <div className="px-5 pb-32">
      <p className="mt-2 text-[12.5px] font-medium text-muted">{tr.t('chores.weekLabel', { n: week, range: formatWeekRange(week, tr.lang) })}</p>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h1 className="truncate text-[24px] font-bold tracking-tight">{tr.t('chores.title')}</h1>
        <div className="flex shrink-0 items-center gap-2">
          <PointsPill />
          <Button size="sm" variant="secondary" onClick={() => openSheet({ kind: 'addChore' })}>
            <Plus size={15} aria-hidden /> {tr.t('common.new')}
          </Button>
        </div>
      </div>

      {/* Rotation rule */}
      <div className="flex items-center gap-3 rounded-2xl bg-pine-50 px-3.5 py-3">
        <RefreshCw size={16} className="shrink-0 text-pine" aria-hidden />
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-1 text-[12.5px] font-semibold text-pine-900">
            {tr.t('chores.weekly')}
            <span className="ml-1 flex items-center gap-0.5">
              {[...MEMBER_ORDER, MEMBER_ORDER[0]].map((id, i) => (
                <span key={i} className="inline-flex items-center gap-0.5">
                  {i > 0 && <span className="text-[10px] text-pine/60">→</span>}
                  <Avatar member={h.member(id)} size="xs" />
                </span>
              ))}
            </span>
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-pine-900/75">{tr.t('chores.rotationHint')}</p>
        </div>
      </div>

      {h.data.chores.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={<ListChecks size={17} />}>{tr.t('chores.empty')}</EmptyState>
        </div>
      ) : (
        <>
          {overdue.length > 0 && (
            <>
              <SectionTitle>
                <span className="text-bad">{tr.t('chores.overdue')}</span>
              </SectionTitle>
              <Group className="divide-y divide-line">
                {overdue.map((a) => (
                  <ChoreRow key={a.id} a={a} showNext={false} />
                ))}
              </Group>
            </>
          )}

          <SectionTitle>{tr.t('chores.yours')}</SectionTitle>
          {mine.length === 0 ? (
            <EmptyState icon={<Sparkles size={17} />}>{tr.t('chores.noneYours')}</EmptyState>
          ) : (
            <Group className="divide-y divide-line">
              {mine.map((a) => (
                <ChoreRow key={a.id} a={a} />
              ))}
            </Group>
          )}

          {others.length > 0 && (
            <>
              <SectionTitle>{tr.t('chores.household')}</SectionTitle>
              <Group className="divide-y divide-line">
                {others.map((a) => (
                  <ChoreRow key={a.id} a={a} />
                ))}
              </Group>
            </>
          )}

          {history.length > 0 && (
            <>
              <SectionTitle
                action={
                  <button
                    type="button"
                    aria-expanded={showHistory}
                    onClick={() => setShowHistory((v) => !v)}
                    className="flex min-h-8 items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-pine hover:bg-pine-50"
                  >
                    {history.length}
                    <ChevronDown size={15} className={cx('transition', showHistory && 'rotate-180')} aria-hidden />
                  </button>
                }
              >
                {tr.t('chores.history')}
              </SectionTitle>
              {showHistory && (
                <Group className="divide-y divide-line">
                  {history.map((a) => (
                    <div key={a.id}>
                      <p className="px-3.5 pt-2.5 text-[11px] font-semibold text-muted">{tr.t('common.week', { n: a.week })}</p>
                      <ChoreRow a={a} showNext={false} />
                    </div>
                  ))}
                </Group>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
