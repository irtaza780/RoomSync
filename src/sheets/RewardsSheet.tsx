import { Check, Flame, Trophy } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatShortDate } from '../domain/dates';
import { POINTS, REWARD_TITLE_MAX, isRewardAgreed, pointLedger, validateRewardTitle } from '../domain/rewards';
import { MEMBER_ORDER } from '../domain/types';
import { listNames } from '../i18n';
import { useHousehold, usePhone, useT } from '../phone/context';
import { newId, nowOnDemoClock, useStore } from '../state/store';
import { Avatar, Button, Group, Sheet, TextInput, cx } from '../ui/primitives';

/** Gamification preview (FR-13 points & streaks, FR-14 leaderboard & household-agreed reward). */
export function RewardsSheet() {
  const tr = useT();
  const h = useHousehold();
  const { dispatch } = useStore();
  const { viewerId, closeSheet, toast } = usePhone();
  const [proposing, setProposing] = useState(false);
  const [title, setTitle] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const proposalId = useRef(newId('reward'));

  const me = h.board.find((r) => r.memberId === viewerId)!;
  const reward = h.data.reward;
  const agreed = isRewardAgreed(reward);
  const iAgreed = !!reward?.agreedBy.includes(viewerId);
  const waiting = reward ? MEMBER_ORDER.filter((m) => !reward.agreedBy.includes(m)) : [];
  const v = validateRewardTitle(title);
  const titleOf = (assignmentId: string) => {
    const a = h.data.assignments.find((x) => x.id === assignmentId);
    return h.data.chores.find((c) => c.id === a?.choreId)?.title ?? '';
  };
  const myPoints = pointLedger(h.data)
    .filter((p) => p.userId === viewerId)
    .reverse()
    .slice(0, 5);

  const propose = () => {
    setSubmitted(true);
    if (!v.ok) return;
    dispatch({ type: 'PROPOSE_REWARD', id: proposalId.current, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId, title });
    proposalId.current = newId('reward');
    setProposing(false);
    setTitle('');
    setSubmitted(false);
  };

  return (
    <Sheet title={tr.t('rewards.title')} onClose={closeSheet}>
      {/* My summary */}
      <div className="flex items-center gap-4 rounded-[20px] bg-mustard-50 p-4">
        <Avatar member={h.viewer} size="md" />
        <div>
          <p className="text-[12px] font-medium text-muted">{tr.t('rewards.yourPoints')}</p>
          <p className="tabular text-[26px] font-bold leading-tight tracking-tight">{tr.t('rewards.pts', { n: me.points })}</p>
        </div>
        <span className="ml-auto flex items-center gap-1 rounded-full bg-surface px-2.5 py-1 text-[12px] font-semibold text-mustard-600">
          <Flame size={13} aria-hidden /> {me.streak > 0 ? tr.tp('rewards.streak', me.streak) : tr.t('rewards.noStreak')}
        </span>
      </div>

      {/* Leaderboard */}
      <Group className="mt-4 divide-y divide-line" >
        {h.board.map((r) => (
          <div key={r.memberId} className={cx('flex items-center gap-3 px-3.5 py-2.5', r.memberId === viewerId && 'bg-cream/50')} data-testid={`leader-${r.memberId}`}>
            <span className={cx('w-5 text-center text-[13px] font-bold', r.rank === 1 ? 'text-mustard-600' : 'text-muted')}>{r.rank}</span>
            <Avatar member={h.member(r.memberId)} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-semibold">{h.who(r.memberId)}</span>
              <span className="flex items-center gap-1 text-[12px] text-muted">
                <Flame size={11} aria-hidden /> {r.streak > 0 ? tr.tp('rewards.streak', r.streak) : tr.t('rewards.noStreak')}
              </span>
            </span>
            {r.rank === 1 && <Trophy size={16} className="text-mustard-600" aria-hidden />}
            <span className="tabular text-[14px] font-bold">{tr.t('rewards.pts', { n: r.points })}</span>
          </div>
        ))}
      </Group>

      {/* Household-agreed reward */}
      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-muted">{tr.t('rewards.rewardTitle')}</h3>
      <div className="rounded-[20px] bg-surface p-4 ring-1 ring-line" data-testid="reward-card">
        {reward ? (
          <>
            <p className="flex items-center gap-2 text-[15px] font-semibold">
              <Trophy size={16} className="shrink-0 text-mustard-600" aria-hidden /> {reward.title}
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <span className="flex -space-x-1">
                {MEMBER_ORDER.map((m) => (
                  <span key={m} className={cx('relative', !reward.agreedBy.includes(m) && 'opacity-35')}>
                    <Avatar member={h.member(m)} size="xs" ring />
                  </span>
                ))}
              </span>
              <span className={cx('text-[12.5px] font-medium', agreed ? 'text-pine' : 'text-muted')}>
                {agreed ? (
                  <span className="inline-flex items-center gap-1">
                    <Check size={13} strokeWidth={3} aria-hidden /> {tr.t('rewards.agreedAll')}
                  </span>
                ) : (
                  tr.t('rewards.waiting', { names: listNames(waiting.map((m) => h.who(m, false)), tr.lang) })
                )}
              </span>
            </div>
            {!iAgreed && (
              <Button
                size="sm"
                className="mt-3 w-full"
                data-testid="agree-reward"
                onClick={() => {
                  dispatch({ type: 'AGREE_REWARD', rewardId: reward.id, at: nowOnDemoClock(h.data.currentWeek), actorId: viewerId });
                  toast(`✓ ${reward.title}`);
                }}
              >
                <Check size={15} aria-hidden /> {tr.t('rewards.agree')}
              </Button>
            )}
          </>
        ) : (
          <p className="text-[13px] text-muted">{tr.t('rewards.noneYet')}</p>
        )}

        {proposing ? (
          <form
            className="mt-3"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              propose();
            }}
          >
            <TextInput
              aria-label={tr.t('rewards.propose')}
              placeholder={tr.t('rewards.placeholder')}
              value={title}
              autoFocus
              onChange={(e) => setTitle(e.target.value)}
              invalid={submitted && !v.ok}
              data-testid="reward-input"
            />
            {submitted && !v.ok && (
              <p role="alert" className="mt-1.5 text-[12.5px] font-medium text-bad">
                {tr.t(`err.reward.${v.error}`, { max: REWARD_TITLE_MAX })}
              </p>
            )}
            <p className="mt-1.5 text-[12px] text-muted">{tr.t('rewards.proposeHint')}</p>
            <div className="mt-2 flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1" onClick={() => setProposing(false)}>
                {tr.t('common.cancel')}
              </Button>
              <Button size="sm" type="submit" className="flex-1" data-testid="save-reward">
                {tr.t('rewards.proposeSave')}
              </Button>
            </div>
          </form>
        ) : (
          <button type="button" onClick={() => setProposing(true)} className="mt-2 min-h-9 rounded-full px-1 text-[13px] font-semibold text-pine hover:underline">
            {reward ? tr.t('rewards.proposeAnother') : tr.t('rewards.propose')}
          </button>
        )}
      </div>

      {/* My recent points */}
      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-muted">{tr.t('rewards.history')}</h3>
      {myPoints.length === 0 ? (
        <p className="rounded-2xl bg-cream/70 px-4 py-3 text-[13px] text-muted">{tr.t('rewards.historyEmpty')}</p>
      ) : (
        <Group className="divide-y divide-line">
          {myPoints.map((p) => (
            <div key={p.refId} className="flex items-center gap-3 px-3.5 py-2.5 text-[13px]">
              <span className="min-w-0 flex-1 truncate">{tr.t(`rewards.src.${p.sourceType}`, { title: titleOf(p.refId) })}</span>
              <span className="text-[11.5px] text-muted">{p.awardedAt && formatShortDate(p.awardedAt, tr.lang)}</span>
              <span className="tabular w-14 text-right font-semibold text-pine">+{p.deltaPoints}</span>
            </div>
          ))}
        </Group>
      )}

      {/* Rules */}
      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-muted">{tr.t('rewards.rules')}</h3>
      <ul className="space-y-1.5 text-[13px]">
        {[
          [tr.t('rewards.rule.onTime'), POINTS.choreOnTime],
          [tr.t('rewards.rule.late'), POINTS.choreLate],
          [tr.t('rewards.rule.settle'), POINTS.settleUp],
        ].map(([label, n]) => (
          <li key={label} className="flex justify-between">
            <span className="text-ink-2">{label}</span>
            <span className="tabular font-semibold">+{n}</span>
          </li>
        ))}
      </ul>
      <p className="mb-2 mt-2 text-[12px] text-muted">{tr.t('rewards.rule.streak')}</p>
    </Sheet>
  );
}
