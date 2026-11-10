import { ArrowRight, Bell, Check, CircleCheck, Flame, Handshake, ListPlus, Receipt, RefreshCw, Star, Trophy, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { assignmentStatus, daysUntilDue, nextAssignee, type ChoreStatus } from '../domain/chores';
import { formatDateTime, formatShortDate } from '../domain/dates';
import { POINTS, isOnTime } from '../domain/rewards';
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

const STATUS_TONE: Record<ChoreStatus, string> = {
  completed: 'text-pine',
  overdue: 'text-bad',
  dueToday: 'text-mustard-600',
  upcoming: 'text-muted',
};

/** Status as coloured text with a dot or icon: never colour alone. */
export function StatusText({ status, children }: { status: ChoreStatus; children?: React.ReactNode }) {
  const tr = useT();
  return (
    <span className={cx('inline-flex items-center gap-1 font-semibold', STATUS_TONE[status])}>
      {status === 'completed' ? <Check size={12} strokeWidth={3} aria-hidden /> : <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children ?? tr.t(`chores.status.${status}`)}
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

/**
 * One assignment as a list row: assignee avatar, title, status line and,
 * for the assigned roommate only, a round check button to mark it done.
 */
export function ChoreRow({ a, showNext = true }: { a: Assignment; showNext?: boolean }) {
  const tr = useT();
  const { dispatch } = useStore();
  const { viewerId, toast } = usePhone();
  const h = useHousehold();
  const [justDone, setJustDone] = useState(false);
  const chore = h.data.chores.find((c) => c.id === a.choreId);
  const status = assignmentStatus(a, h.today);
  const mine = a.assigneeId === viewerId;
  const assignee = h.member(a.assigneeId);
  const done = a.status === 'done';
  const late = done && !isOnTime(a);

  const complete = () => {
    const willBeLate = h.data.currentWeek > a.week;
    setJustDone(true);
    dispatch({ type: 'COMPLETE_ASSIGNMENT', assignmentId: a.id, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId });
    toast(tr.t('rewards.toast', { n: willBeLate ? POINTS.choreLate : POINTS.choreOnTime, title: chore?.title ?? '' }));
  };

  const who = mine ? tr.t('common.you') : assignee.name;
  let detail: React.ReactNode;
  if (done) {
    detail = (
      <>
        <StatusText status="completed">
          {late ? tr.t('chores.doneLate') : tr.t('chores.status.completed')} · {tr.t('rewards.earned', { n: late ? POINTS.choreLate : POINTS.choreOnTime })}
        </StatusText>
        <span className="text-muted"> · {who}</span>
      </>
    );
  } else {
    detail = (
      <>
        {status !== 'upcoming' && (
          <>
            <StatusText status={status} />
            <span className="text-muted"> · </span>
          </>
        )}
        <span className="text-muted">
          {who} · {dueText(a, h.today, tr)}
        </span>
      </>
    );
  }

  return (
    <div className="flex items-center gap-3 px-3.5 py-3">
      <Avatar member={assignee} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cx('truncate text-[14.5px] font-semibold leading-snug', done && 'text-muted line-through decoration-muted/40')}>{chore?.title}</p>
        <p className="mt-0.5 text-[12.5px] leading-snug">{detail}</p>
        {showNext && chore && a.week === h.data.currentWeek && !done && (
          <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted">
            <RefreshCw size={11} aria-hidden /> {tr.t('chores.next', { name: h.who(nextAssignee(chore)) })}
            {mine && <span className="ml-1 font-semibold text-mustard-600">{tr.t('rewards.onTimeHint', { n: POINTS.choreOnTime })}</span>}
          </p>
        )}
      </div>
      {mine && !done && (
        <button
          type="button"
          onClick={complete}
          disabled={justDone}
          aria-label={`${tr.t('chores.markDone')}: ${chore?.title ?? ''}`}
          title={tr.t('chores.markDone')}
          className={cx(
            'grid size-10 shrink-0 place-items-center rounded-full border-2 transition',
            status === 'overdue' ? 'border-bad/50 text-bad hover:bg-bad-50' : 'border-pine/40 text-pine hover:bg-pine-50',
          )}
        >
          <Check size={18} strokeWidth={2.5} aria-hidden />
        </button>
      )}
      {done && (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-pine-50 text-pine" aria-hidden>
          <Check size={18} strokeWidth={2.5} />
        </span>
      )}
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
  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5">
      <div className="flex items-center">
        <Avatar member={h.member(t.fromUserId)} size="xs" />
        <ArrowRight size={12} className="mx-0.5 text-muted" aria-hidden />
        <Avatar member={h.member(t.toUserId)} size="xs" />
      </div>
      <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{label}</p>
      <span className="tabular text-[13.5px] font-bold">{tr.money(t.amountCents)}</span>
      {onSettle && (
        <button type="button" onClick={onSettle} className="min-h-8 rounded-full px-2.5 text-[12.5px] font-semibold text-pine hover:bg-pine-50">
          {tr.t('expenses.settle')}
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
        detail: `${tr.t(e.payload.late ? 'activity.chore_completed.detailLate' : 'activity.chore_completed.detail', { week: e.payload.week })} · ${tr.t('rewards.earned', { n: e.payload.late ? POINTS.choreLate : POINTS.choreOnTime })}`,
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
    case 'reward_proposed':
      return {
        title: tr.t(`activity.reward_proposed.${self}`, { actor }),
        detail: tr.t('activity.reward_proposed.detail', { title: e.payload.title }),
      };
    case 'reward_agreed':
      return {
        title: tr.t('activity.reward_agreed.title', { title: e.payload.title }),
        detail: tr.t('activity.reward_agreed.detail'),
      };
  }
}

const ACTIVITY_ICON = {
  expense_added: { Icon: Receipt, cls: 'bg-mustard-50 text-mustard-600' },
  settlement_added: { Icon: Handshake, cls: 'bg-pine-50 text-pine' },
  chore_created: { Icon: ListPlus, cls: 'bg-cream text-ink-2' },
  chore_completed: { Icon: CircleCheck, cls: 'bg-pine-50 text-pine' },
  week_advanced: { Icon: RefreshCw, cls: 'bg-cream text-ink-2' },
  chore_overdue: { Icon: Bell, cls: 'bg-bad-50 text-bad' },
  reward_proposed: { Icon: Sparkles, cls: 'bg-mustard-50 text-mustard-600' },
  reward_agreed: { Icon: Trophy, cls: 'bg-mustard-50 text-mustard-600' },
} as const;

export function ActivityRow({ e, onClick, showWeek = true }: { e: ActivityEntry; onClick?: () => void; showWeek?: boolean }) {
  const tr = useT();
  const h = useHousehold();
  const { viewerId } = usePhone();
  const { title, detail } = activityText(e, h, tr, viewerId);
  const { Icon, cls } = ACTIVITY_ICON[e.type];
  const body = (
    <>
      <span className={cx('grid size-8 shrink-0 place-items-center rounded-full', cls)}>
        <Icon size={15} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold leading-snug">{title}</span>
        <span className="block text-[12px] leading-snug text-muted">{detail}</span>
        <span className="mt-0.5 block text-[11px] text-muted/80">
          {formatDateTime(e.at, tr.lang)}
          {showWeek && ` · ${tr.t('common.week', { n: e.week })}`}
        </span>
      </span>
    </>
  );
  const cls2 = 'flex w-full items-start gap-3 px-3.5 py-3 text-left';
  return onClick ? (
    <button type="button" onClick={onClick} className={cx(cls2, 'hover:bg-cream/60')}>
      {body}
    </button>
  ) : (
    <div className={cls2}>{body}</div>
  );
}

/** Always-visible points + streak pill (top of Home and Chores). Opens the Household points sheet. */
export function PointsPill() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, openSheet } = usePhone();
  const me = h.board.find((r) => r.memberId === viewerId)!;
  return (
    <button
      type="button"
      onClick={() => openSheet({ kind: 'rewards' })}
      aria-label={`${tr.t('rewards.title')}: ${tr.t('rewards.pts', { n: me.points })}, ${me.streak > 0 ? tr.tp('rewards.streak', me.streak) : tr.t('rewards.noStreak')}`}
      className="inline-flex min-h-9 shrink-0 items-center gap-2 rounded-full bg-mustard-50 px-3 text-[12.5px] font-semibold text-ink ring-1 ring-mustard/30 transition hover:bg-mustard-100"
      data-testid="points-pill"
    >
      <span className="inline-flex items-center gap-1">
        <Star size={13} className="fill-mustard text-mustard" aria-hidden />
        <span className="tabular">{tr.t('rewards.pts', { n: me.points })}</span>
      </span>
      <span className="h-3.5 w-px bg-mustard/40" aria-hidden />
      <span className="inline-flex items-center gap-1 text-mustard-600">
        <Flame size={13} aria-hidden />
        <span className="tabular">{me.streak}</span>
      </span>
    </button>
  );
}
