import { Bell, ChevronRight, Flame, Handshake, Plus, Sparkles, Trophy } from 'lucide-react';
import { assignmentStatus, sortAssignments } from '../domain/chores';
import { formatShortDate, formatWeekRange } from '../domain/dates';
import { isRewardAgreed } from '../domain/rewards';
import { MEMBER_ORDER } from '../domain/types';
import { listNames } from '../i18n';
import { useHousehold, usePhone, useT } from '../phone/context';
import { ActivityRow, ChoreRow, PointsPill, balanceSentence } from '../phone/shared';
import { Button, EmptyState, Group, LinkButton, SectionTitle, cx } from '../ui/primitives';

export function HomeScreen() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, setTab, openSheet } = usePhone();
  const my = h.balances[viewerId];
  const myTransfers = h.transfers.filter((t) => t.fromUserId === viewerId || t.toUserId === viewerId);

  // Open chores for me: this week's plus anything still overdue from earlier weeks.
  const openMine = sortAssignments(
    h.data.assignments.filter((a) => a.assigneeId === viewerId && a.status === 'pending' && a.week <= h.data.currentWeek),
    h.today,
  );
  const overdue = openMine.filter((a) => assignmentStatus(a, h.today) === 'overdue');
  const recent = [...h.data.activity].sort((a, b) => b.seq - a.seq).slice(0, 3);
  const me = h.board.find((r) => r.memberId === viewerId)!;
  const reward = h.data.reward;

  return (
    <div className="px-5 pb-32">
      <header className="mb-5 mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-medium text-muted">
            {tr.t('common.week', { n: h.data.currentWeek })} · {formatWeekRange(h.data.currentWeek, tr.lang)}
          </p>
          <h1 className="truncate text-[24px] font-bold tracking-tight">{tr.t('home.greeting', { name: h.viewer.name })}</h1>
        </div>
        <PointsPill />
      </header>

      {/* Balance summary */}
      <button
        type="button"
        onClick={() => setTab('expenses')}
        className="block w-full rounded-[24px] bg-pine-900 p-5 text-left text-white transition active:scale-[0.99]"
      >
        <span className="flex items-center justify-between text-[12.5px] font-medium text-pine-100/80">
          {tr.t('home.yourBalance')}
          <ChevronRight size={16} aria-hidden />
        </span>
        <span className="tabular mt-1 block text-[32px] font-bold leading-tight tracking-tight" data-testid="home-balance">
          {tr.signed(my)}
        </span>
        <span className={cx('mt-0.5 block text-[13.5px] font-semibold', my >= 0 ? 'text-mustard-100' : 'text-white')}>{balanceSentence(my, tr)}</span>
        {myTransfers.length > 0 && (
          <span className="mt-4 block space-y-1.5 border-t border-white/10 pt-3">
            {myTransfers.map((t) => (
              <span key={`${t.fromUserId}-${t.toUserId}`} className="flex items-center justify-between text-[12.5px] text-pine-100">
                <span>
                  {t.fromUserId === viewerId
                    ? tr.t('owes.youOwe', { name: h.member(t.toUserId).name })
                    : tr.t('owes.owesYou', { name: h.member(t.fromUserId).name })}
                </span>
                <span className="tabular font-semibold text-white">{tr.money(t.amountCents)}</span>
              </span>
            ))}
          </span>
        )}
      </button>

      <div className="mt-3 flex gap-2">
        <Button size="sm" variant="accent" className="flex-1" onClick={() => openSheet({ kind: 'addExpense' })}>
          <Plus size={16} aria-hidden /> {tr.t('home.quickAddExpense')}
        </Button>
        <Button size="sm" variant="secondary" className="flex-1" onClick={() => openSheet({ kind: 'settle' })}>
          <Handshake size={16} aria-hidden /> {tr.t('home.quickSettle')}
        </Button>
      </div>

      {/* In-app reminder */}
      {overdue[0] && (
        <div role="status" className="mt-3 flex items-center gap-2.5 rounded-2xl bg-bad-50 px-3.5 py-2.5 text-[12.5px]">
          <Bell size={15} className="shrink-0 text-bad" aria-hidden />
          <p className="min-w-0">
            <span className="font-semibold text-bad">{tr.t('home.reminder')} · </span>
            {tr.t('home.overdueReminder', {
              title: h.data.chores.find((c) => c.id === overdue[0].choreId)?.title ?? '',
              date: formatShortDate(overdue[0].dueAt, tr.lang),
            })}
          </p>
        </div>
      )}

      <SectionTitle action={<LinkButton onClick={() => setTab('chores')}>{tr.t('common.seeAll')}</LinkButton>}>{tr.t('home.yourChores')}</SectionTitle>
      {openMine.length === 0 ? (
        <EmptyState icon={<Sparkles size={17} />}>{tr.t('home.noChores')}</EmptyState>
      ) : (
        <Group className="divide-y divide-line">
          {openMine.slice(0, 3).map((a) => (
            <ChoreRow key={a.id} a={a} showNext={false} />
          ))}
        </Group>
      )}

      {/* Gamification: points, streak and leaderboard (FR-13/FR-14) */}
      <SectionTitle action={<LinkButton onClick={() => openSheet({ kind: 'rewards' })}>{tr.t('common.seeAll')}</LinkButton>}>
        {tr.t('rewards.title')}
      </SectionTitle>
      <button
        type="button"
        onClick={() => openSheet({ kind: 'rewards' })}
        className="block w-full rounded-[20px] bg-mustard-50 p-4 text-left ring-1 ring-mustard/25 transition active:scale-[0.99]"
        data-testid="points-card"
      >
        <span className="flex items-center gap-4">
          <span>
            <span className="block text-[12px] font-medium text-muted">{tr.t('rewards.yourPoints')}</span>
            <span className="tabular block text-[26px] font-bold leading-tight tracking-tight">{me.points}</span>
          </span>
          <span className="ml-auto flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-mustard-600">
            <Flame size={13} aria-hidden /> {me.streak > 0 ? tr.tp('rewards.streak', me.streak) : tr.t('rewards.noStreak')}
          </span>
        </span>
        <span className="mt-3 flex items-center gap-2">
          {h.board.map((r) => (
            <span
              key={r.memberId}
              className={cx('flex flex-1 items-center justify-between rounded-xl px-2.5 py-1.5 text-[12px]', r.memberId === viewerId ? 'bg-surface font-semibold' : 'bg-surface/50')}
            >
              <span className="truncate">
                {r.rank === 1 && <Trophy size={11} className="mr-1 inline text-mustard-600" aria-label="1" />}
                {h.who(r.memberId)}
              </span>
              <span className="tabular text-muted">{r.points}</span>
            </span>
          ))}
        </span>
        {reward && (
          <span className="mt-2.5 block truncate text-[12px] text-ink-2">
            <Trophy size={12} className="mr-1 inline text-mustard-600" aria-hidden />
            {tr.t('rewards.leaderGets', { title: `“${reward.title}”` })}
            {!isRewardAgreed(reward) && (
              <span className="text-muted">
                {' · '}
                {tr.t('rewards.waiting', {
                  names: listNames(
                    MEMBER_ORDER.filter((m) => !reward.agreedBy.includes(m)).map((m) => h.who(m, false)),
                    tr.lang,
                  ),
                })}
              </span>
            )}
          </span>
        )}
      </button>

      <SectionTitle action={<LinkButton onClick={() => setTab('activity')}>{tr.t('common.seeAll')}</LinkButton>}>{tr.t('home.recent')}</SectionTitle>
      <Group className="divide-y divide-line overflow-hidden">
        {recent.length === 0 ? (
          <p className="px-4 py-4 text-[13px] text-muted">{tr.t('activity.empty')}</p>
        ) : (
          recent.map((e) => <ActivityRow key={e.id} e={e} onClick={() => setTab('activity')} />)
        )}
      </Group>
    </div>
  );
}
