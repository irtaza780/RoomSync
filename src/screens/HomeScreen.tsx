import { Bell, ChevronRight, Handshake, ListChecks, Plus, Sparkles } from 'lucide-react';
import { assignmentStatus, sortAssignments } from '../domain/chores';
import { formatShortDate, formatWeekRange } from '../domain/dates';
import { useHousehold, usePhone, useT } from '../phone/context';
import { ActivityRow, ChoreRow, balanceSentence } from '../phone/shared';
import { Card, EmptyState, LinkButton, SectionTitle, cx } from '../ui/primitives';

export function HomeScreen() {
  const tr = useT();
  const h = useHousehold();
  const { viewerId, setTab, openSheet } = usePhone();
  const my = h.balances[viewerId];
  const myTransfers = h.transfers.filter((t) => t.fromUserId === viewerId || t.toUserId === viewerId);

  // My open chores: this week's plus anything overdue from earlier weeks.
  const mine = sortAssignments(
    h.data.assignments.filter(
      (a) => a.assigneeId === viewerId && (a.week === h.data.currentWeek || (a.status === 'pending' && a.week < h.data.currentWeek)),
    ),
    h.today,
  );
  const openMine = mine.filter((a) => a.status === 'pending');
  const overdue = openMine.filter((a) => assignmentStatus(a, h.today) === 'overdue');
  const reminder = overdue[0] ?? openMine[0];
  const recent = [...h.data.activity].sort((a, b) => b.seq - a.seq).slice(0, 3);

  return (
    <div className="px-4 pb-6">
      <div className="mb-4 mt-1 flex items-end justify-between px-1">
        <div>
          <p className="text-[13px] font-medium text-muted">
            {tr.t('common.week', { n: h.data.currentWeek })} · {formatWeekRange(h.data.currentWeek, tr.lang)}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight">{tr.t('home.greeting', { name: h.viewer.name })}</h1>
        </div>
      </div>

      {/* Balance summary */}
      <button
        type="button"
        onClick={() => setTab('expenses')}
        className="relative block w-full overflow-hidden rounded-[28px] bg-mustard p-5 text-left shadow-card transition active:scale-[0.99]"
      >
        <span aria-hidden className="absolute -right-10 -top-12 size-40 rounded-full bg-mustard-100/30" />
        <span aria-hidden className="absolute -bottom-16 right-10 size-32 rounded-full bg-ink/5" />
        <span className="relative block text-[13px] font-semibold text-ink/70">{tr.t('home.yourBalance')}</span>
        <span className="tabular relative mt-1 block text-[34px] font-extrabold leading-none tracking-tight" data-testid="home-balance">
          {tr.signed(my)}
        </span>
        <span className="relative mt-2 block text-[15px] font-semibold">{balanceSentence(my, tr)}</span>
        <span className="relative mt-3 block space-y-1 border-t border-ink/10 pt-3">
          {myTransfers.length === 0 ? (
            <span className="block text-[13px] text-ink/70">{tr.t('expenses.allSettled')}</span>
          ) : (
            myTransfers.map((t) => (
              <span key={`${t.fromUserId}-${t.toUserId}`} className="flex items-center justify-between text-[13px]">
                <span>
                  {t.fromUserId === viewerId
                    ? tr.t('owes.youOwe', { name: h.member(t.toUserId).name })
                    : tr.t('owes.owesYou', { name: h.member(t.fromUserId).name })}
                </span>
                <span className="tabular font-bold">{tr.money(t.amountCents)}</span>
              </span>
            ))
          )}
          <span className="flex items-center gap-1 pt-1 text-[12px] font-semibold text-ink/65">
            {tr.t('home.balanceBreakdown')} <ChevronRight size={14} aria-hidden />
          </span>
        </span>
      </button>

      {/* Quick actions */}
      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { label: tr.t('home.quickAddExpense'), Icon: Plus, onClick: () => openSheet({ kind: 'addExpense' }), primary: true },
          { label: tr.t('home.quickSettle'), Icon: Handshake, onClick: () => openSheet({ kind: 'settle' }) },
          { label: tr.t('home.quickChores'), Icon: ListChecks, onClick: () => setTab('chores') },
        ].map(({ label, Icon, onClick, primary }) => (
          <button
            key={label}
            type="button"
            onClick={onClick}
            className={cx(
              'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-2xl px-2 text-center text-[12.5px] font-semibold leading-tight ring-1 transition',
              primary ? 'bg-ink text-surface ring-ink hover:bg-ink-2' : 'bg-surface text-ink ring-line hover:ring-mustard/60',
            )}
          >
            <Icon size={20} aria-hidden />
            {label}
          </button>
        ))}
      </div>

      {/* In-app reminder */}
      {reminder && (
        <div
          role="status"
          className={cx(
            'mt-3 flex items-start gap-3 rounded-2xl p-3.5 ring-1',
            overdue.length ? 'bg-bad-50 ring-bad/25' : 'bg-mustard-50 ring-mustard/30',
          )}
        >
          <Bell size={18} className={cx('mt-0.5 shrink-0', overdue.length ? 'text-bad' : 'text-mustard-600')} aria-hidden />
          <div className="text-[13px]">
            <p className="font-bold">{tr.t('home.reminder')}</p>
            <p className="text-ink-2">
              {overdue.length
                ? tr.t('home.overdueReminder', {
                    title: h.data.chores.find((c) => c.id === reminder.choreId)?.title ?? '',
                    date: formatShortDate(reminder.dueAt, tr.lang),
                  })
                : tr.t('home.dueReminder', {
                    title: h.data.chores.find((c) => c.id === reminder.choreId)?.title ?? '',
                    when: formatShortDate(reminder.dueAt, tr.lang),
                  })}
            </p>
          </div>
        </div>
      )}

      <SectionTitle action={<LinkButton onClick={() => setTab('chores')}>{tr.t('common.seeAll')}</LinkButton>}>
        {tr.t('home.yourChores')}
      </SectionTitle>
      <div className="space-y-2">
        {mine.length === 0 || openMine.length === 0 ? (
          <EmptyState icon={<Sparkles size={20} />}>{tr.t('home.noChores')}</EmptyState>
        ) : (
          openMine.slice(0, 3).map((a) => <ChoreRow key={a.id} a={a} compact />)
        )}
      </div>

      <SectionTitle action={<LinkButton onClick={() => setTab('activity')}>{tr.t('common.seeAll')}</LinkButton>}>
        {tr.t('home.recent')}
      </SectionTitle>
      <Card className="py-1">
        {recent.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted">{tr.t('activity.empty')}</p>
        ) : (
          <div className="divide-y divide-line">
            {recent.map((e) => (
              <ActivityRow key={e.id} e={e} onClick={() => setTab('activity')} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
