import {
  ArrowRight,
  Bell,
  CalendarClock,
  CircleCheck,
  Handshake,
  ListPlus,
  Receipt,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { assignmentStatus, daysUntilDue, nextAssignee, type ChoreStatus } from '../domain/chores';
import { formatDateTime, formatShortDate } from '../domain/dates';
import type { ActivityEntry, Assignment, Transfer } from '../domain/types';
import { useStore, nowOnDemoClock } from '../state/store';
import { Avatar, cx } from '../ui/primitives';
import { useHousehold, usePhone, useT } from './context';

export function balanceSentence(cents: number, tr: ReturnType<typeof useT>): string {
  if (cents > 0) return tr.t('balance.owed', { amount: tr.money(cents) });
  if (cents < 0) return tr.t('balance.owe', { amount: tr.money(-cents) });
  return tr.t('balance.settled');
}

// ---------------------------------------------------------------------------

const STATUS_STYLE: Record<ChoreStatus, string> = {
  completed: 'bg-good-50 text-good',
  overdue: 'bg-bad-50 text-bad',
  dueToday: 'bg-mustard-100 text-ink',
  upcoming: 'bg-cream text-ink-2',
};

export function StatusPill({ status }: { status: ChoreStatus }) {
  const tr = useT();
  const Icon = status === 'completed' ? CircleCheck : status === 'overdue' ? TriangleAlert : CalendarClock;
  return (
    <span className={cx('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLE[status])}>
      <Icon size={12} strokeWidth={2.5} aria-hidden />
      {tr.t(`chores.status.${status}`)}
    </span>
  );
}

export function dueText(a: Assignment, today: string, tr: ReturnType<typeof useT>): string {
  const status = assignmentStatus(a, today);
  const date = formatShortDate(a.dueAt, tr.lang);
  if (status === 'overdue') return tr.t('chores.wasDue', { date });
  if (status === 'dueToday') return tr.t('chores.dueToday', { date });
  return tr.tp('chores.dueIn', daysUntilDue(a, today), { date });
}

/** One assignment row with status, due date, rotation hint and (for the assignee) a Mark-done button. */
export function ChoreRow({ a, showNext = true, compact = false }: { a: Assignment; showNext?: boolean; compact?: boolean }) {
  const tr = useT();
  const { dispatch } = useStore();
  const { viewerId, toast } = usePhone();
  const h = useHousehold();
  const chore = h.data.chores.find((c) => c.id === a.choreId);
  const status = assignmentStatus(a, h.today);
  const mine = a.assigneeId === viewerId;
  const assignee = h.member(a.assigneeId);
  const late = a.status === 'done' && (a.completedWeek ?? a.week) > a.week;

  const complete = () => {
    dispatch({ type: 'COMPLETE_ASSIGNMENT', assignmentId: a.id, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId });
    toast(`✓ ${chore?.title ?? ''}`);
  };

  return (
    <div
      className={cx(
        'flex items-start gap-3 rounded-2xl bg-surface p-3.5 ring-1',
        status === 'overdue' ? 'ring-bad/30' : 'ring-line/80',
        status === 'completed' && 'opacity-80',
      )}
    >
      <Avatar member={assignee} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cx('text-[15px] font-semibold leading-snug', status === 'completed' && 'text-ink-2 line-through decoration-ink/30')}>
            {chore?.title}
          </p>
          <StatusPill status={status} />
        </div>
        <p className="mt-0.5 text-[13px] text-muted">
          {mine ? tr.t('chores.assignedToYou') : tr.t('chores.assignedTo', { name: assignee.name })}
          {' · '}
          {a.status === 'done'
            ? `${tr.t('chores.doneBy', { name: h.who(a.completedBy ?? a.assigneeId, false), date: formatShortDate(a.completedAt ?? a.dueAt, tr.lang) })}${late ? ` · ${tr.t('chores.doneLate')}` : ''}`
            : dueText(a, h.today, tr)}
        </p>
        {showNext && chore && a.week === h.data.currentWeek && !compact && (
          <p className="mt-1 flex items-center gap-1 text-[12px] text-muted">
            <RefreshCw size={12} aria-hidden /> {tr.t('chores.nextWeek', { name: h.who(nextAssignee(chore)) })}
          </p>
        )}
        {mine && a.status !== 'done' && (
          <div>
          <button
            type="button"
            onClick={complete}
            className="mt-2.5 inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-ink px-3.5 text-[13px] font-semibold text-surface hover:bg-ink-2"
          >
            <CircleCheck size={16} aria-hidden /> {tr.t('chores.markDone')}
          </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

export function TransferRow({ t, onSettle }: { t: Transfer; onSettle?: () => void }) {
  const tr = useT();
  const { viewerId } = usePhone();
  const h = useHousehold();
  const label =
    t.fromUserId === viewerId
      ? tr.t('owes.youOwe', { name: h.member(t.toUserId).name })
      : t.toUserId === viewerId
        ? tr.t('owes.owesYou', { name: h.member(t.fromUserId).name })
        : tr.t('owes.other', { from: h.member(t.fromUserId).name, to: h.member(t.toUserId).name });
  const involvesYou = t.fromUserId === viewerId || t.toUserId === viewerId;
  return (
    <div className={cx('flex items-center gap-3 py-2.5', !involvesYou && 'opacity-75')}>
      <div className="flex items-center -space-x-1.5">
        <Avatar member={h.member(t.fromUserId)} size="xs" ring />
        <span className="z-10 grid size-5 place-items-center rounded-full bg-surface ring-1 ring-line">
          <ArrowRight size={11} aria-hidden />
        </span>
        <Avatar member={h.member(t.toUserId)} size="xs" ring />
      </div>
      <p className="min-w-0 flex-1 text-sm font-medium">{label}</p>
      <span className="tabular text-sm font-bold">{tr.money(t.amountCents)}</span>
      {onSettle && (
        <button type="button" onClick={onSettle} className="min-h-8 rounded-lg bg-cream px-2.5 text-[12px] font-semibold hover:bg-line">
          {tr.t('expenses.settleUp')}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

export function activityText(e: ActivityEntry, h: ReturnType<typeof useHousehold>, tr: ReturnType<typeof useT>, viewerId: string) {
  const self = e.actorId === viewerId ? 'self' : 'other';
  const actor = h.who(e.actorId);
  switch (e.type) {
    case 'expense_added':
      return {
        title: tr.t(`activity.expense_added.${self}`, { actor, title: e.payload.title }),
        detail: tr.t('activity.expense_added.detail', {
          amount: tr.money(e.payload.totalCents),
          payer: h.who(e.payload.payerId, false),
          split: tr.t(e.payload.splitType === 'equal' ? 'activity.splitEqual' : 'activity.splitCustom'),
        }),
      };
    case 'settlement_added':
      return {
        title: tr.t(`activity.settlement_added.${self}`, { actor }),
        detail: tr.t('activity.settlement_added.detail', {
          from: h.who(e.payload.fromUserId),
          to: h.who(e.payload.toUserId, false),
          amount: tr.money(e.payload.amountCents),
        }),
      };
    case 'chore_created':
      return {
        title: tr.t(`activity.chore_created.${self}`, { actor, title: e.payload.title }),
        detail: tr.t('activity.chore_created.detail', { name: h.who(e.payload.assigneeId) }),
      };
    case 'chore_completed':
      return {
        title: tr.t(`activity.chore_completed.${self}`, { actor, title: e.payload.title }),
        detail: tr.t(e.payload.late ? 'activity.chore_completed.detailLate' : 'activity.chore_completed.detail', { week: e.payload.week }),
      };
    case 'week_advanced':
      return {
        title: tr.t('activity.week_advanced.title', { week: e.payload.week }),
        detail: tr.tp('activity.week_advanced.detail', e.payload.rotated),
      };
    case 'chore_overdue':
      return {
        title: tr.t('activity.chore_overdue.title', { title: e.payload.title }),
        detail: tr.t('activity.chore_overdue.detail', { name: h.who(e.payload.assigneeId), week: e.payload.week }),
      };
  }
}

const ACTIVITY_ICON = {
  expense_added: { Icon: Receipt, cls: 'bg-mustard-100 text-ink' },
  settlement_added: { Icon: Handshake, cls: 'bg-good-50 text-good' },
  chore_created: { Icon: ListPlus, cls: 'bg-cream text-ink-2' },
  chore_completed: { Icon: CircleCheck, cls: 'bg-good-50 text-good' },
  week_advanced: { Icon: RefreshCw, cls: 'bg-cream text-ink-2' },
  chore_overdue: { Icon: Bell, cls: 'bg-bad-50 text-bad' },
} as const;

export function ActivityRow({ e, onClick, showWeek = true }: { e: ActivityEntry; onClick?: () => void; showWeek?: boolean }) {
  const tr = useT();
  const h = useHousehold();
  const { viewerId } = usePhone();
  const { title, detail } = activityText(e, h, tr, viewerId);
  const { Icon, cls } = ACTIVITY_ICON[e.type];
  const body = (
    <>
      <span className={cx('grid size-9 shrink-0 place-items-center rounded-full', cls)}>
        <Icon size={17} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-snug">{title}</span>
        <span className="block text-[12.5px] text-muted">{detail}</span>
        <span className="mt-0.5 block text-[11.5px] text-muted/80">
          {formatDateTime(e.at, tr.lang)}
          {showWeek && ` · ${tr.t('common.week', { n: e.week })}`}
        </span>
      </span>
    </>
  );
  return onClick ? (
    <button type="button" onClick={onClick} className="flex w-full items-start gap-3 rounded-2xl py-2.5 text-left hover:bg-cream/60">
      {body}
    </button>
  ) : (
    <div className="flex items-start gap-3 py-2.5">{body}</div>
  );
}
