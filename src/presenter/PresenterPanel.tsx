import { CalendarDays, ClipboardCheck, Database, FlaskConical, Info, MonitorSmartphone, RotateCcw, Sparkles, StepForward, TriangleAlert } from 'lucide-react';
import { useState } from 'react';
import { demoToday, formatShortDate, formatWeekRange } from '../domain/dates';
import { balancesOf, householdTotal } from '../domain/expenses';
import { formatCents } from '../domain/money';
import { MEMBER_ORDER, type Lang, type MemberId, type ScenarioName } from '../domain/types';
import { STORAGE_KEY } from '../state/storage';
import { useStore } from '../state/store';
import { demoAt, MEMBERS } from '../state/seed';
import { Avatar, cx } from '../ui/primitives';

export type EvidenceTab = 'validation' | 'about';

function Group({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <section className="border-t border-line pt-4">
      <h3 className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold uppercase tracking-wider text-muted">
        {icon}
        {title}
      </h3>
      {children}
    </section>
  );
}

function Chip({ active, onClick, children, testId }: { active: boolean; onClick: () => void; children: React.ReactNode; testId?: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      data-testid={testId}
      className={cx(
        'flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl px-2 text-[13px] font-semibold ring-1 transition',
        active ? 'bg-pine-900 text-white ring-pine-900' : 'bg-surface text-ink ring-line hover:ring-pine/50',
      )}
    >
      {children}
    </button>
  );
}

function ActionButton({ onClick, children, variant = 'plain', testId }: { onClick: () => void; children: React.ReactNode; variant?: 'plain' | 'accent' | 'danger'; testId?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={cx(
        'flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-[13px] font-semibold ring-1 transition',
        variant === 'accent' && 'bg-pine text-white ring-pine hover:bg-pine-700',
        variant === 'plain' && 'bg-surface ring-line hover:ring-pine/50',
        variant === 'danger' && 'bg-surface text-bad ring-bad/30 hover:bg-bad-50',
      )}
    >
      {children}
    </button>
  );
}

export function PresenterPanel({ onOpenEvidence }: { onOpenEvidence: (t: EvidenceTab) => void }) {
  const { state, dispatch, save, loadStatus, loadDetail, resetDemo, dismissLoadNotice } = useStore();
  const [confirmReset, setConfirmReset] = useState(false);
  const { prefs, data } = state;
  const b = balancesOf(data);
  const total = householdTotal(b);

  const advance = () => dispatch({ type: 'ADVANCE_WEEK', toWeek: data.currentWeek + 1, at: demoAt(data.currentWeek + 1, 0, 0) });
  const load = (scenario: ScenarioName) => dispatch({ type: 'LOAD_SCENARIO', scenario });

  return (
    <aside className="w-full rounded-[28px] bg-surface/90 p-5 shadow-card ring-1 ring-line backdrop-blur" aria-label="Presenter controls">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mustard-600">Presenter panel</p>
          <h1 className="text-xl font-extrabold tracking-tight">Room Sync</h1>
        </div>
        <span className="rounded-full bg-ink px-2.5 py-1 text-[11px] font-bold text-surface">Local interactive PoC</span>
      </div>
      <p className="mt-1 text-[12.5px] leading-snug text-muted">
        React · Vite · TypeScript. All data lives in this browser’s localStorage. No backend, accounts or network calls.
      </p>

      {(loadStatus === 'corrupt' || loadStatus === 'incompatible' || loadStatus === 'unavailable') && (
        <div role="alert" className="mt-3 rounded-2xl bg-bad-50 p-3 text-[12.5px] text-ink ring-1 ring-bad/25">
          <p className="flex items-center gap-1.5 font-bold text-bad">
            <TriangleAlert size={14} aria-hidden />
            {loadStatus === 'unavailable' ? 'localStorage unavailable' : 'Saved demo data could not be read'}
          </p>
          <p className="mt-1">
            {loadStatus === 'unavailable'
              ? 'Changes will work but will not survive a refresh (private mode or storage blocked).'
              : `Reason: ${loadDetail}. A fresh populated demo is loaded and the unreadable record was copied to a backup key.`}
          </p>
          <div className="mt-2 flex gap-2">
            {loadStatus !== 'unavailable' && (
              <button type="button" onClick={resetDemo} className="rounded-lg bg-ink px-2.5 py-1.5 font-semibold text-surface">
                Restore demo
              </button>
            )}
            <button type="button" onClick={dismissLoadNotice} className="rounded-lg px-2.5 py-1.5 font-semibold ring-1 ring-line">
              Dismiss
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 space-y-4">
        <Group title="Active roommate (simulated sign-in)">
          <div className="flex gap-1.5">
            {MEMBERS.map((m) => (
              <Chip key={m.id} active={prefs.activeMemberId === m.id} onClick={() => dispatch({ type: 'SET_ACTIVE_MEMBER', memberId: m.id })} testId={`presenter-member-${m.id}`}>
                <Avatar member={m} size="xs" /> {m.name}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Language">
          <div className="flex gap-1.5">
            {(['en', 'fr'] as Lang[]).map((l) => (
              <Chip key={l} active={prefs.lang === l} onClick={() => dispatch({ type: 'SET_LANG', lang: l })} testId={`presenter-lang-${l}`}>
                {l === 'en' ? 'English' : 'Français'}
              </Chip>
            ))}
          </div>
        </Group>

        <Group title="Demo week" icon={<CalendarDays size={13} aria-hidden />}>
          <p className="mb-2 text-[13px]">
            <span className="font-bold">Week {data.currentWeek}</span> · {formatWeekRange(data.currentWeek, 'en')}
            <span className="block text-[12px] text-muted">Demo “today”: {formatShortDate(demoToday(data.currentWeek), 'en')} (same weekday as your clock)</span>
          </p>
          <ActionButton onClick={advance} variant="accent" testId="advance-week">
            <StepForward size={16} aria-hidden /> Advance demo week → {data.currentWeek + 1}
          </ActionButton>
          <p className="mt-1.5 text-[11.5px] text-muted">Rotates every weekly chore once (Syed → Abin → Debbie) and flags unfinished chores as overdue.</p>
        </Group>

        <Group title="Scenario">
          <div className="space-y-1.5">
            <ActionButton onClick={() => load('populated')} testId="load-populated">
              <Sparkles size={16} aria-hidden /> Load populated demo
              {state.scenario === 'populated' && <span className="ml-auto text-[11px] text-muted">current</span>}
            </ActionButton>
            <ActionButton onClick={() => load('clean')} testId="load-clean">
              <ClipboardCheck size={16} aria-hidden /> Load clean scenario (zero balances)
              {state.scenario === 'clean' && <span className="ml-auto text-[11px] text-muted">current</span>}
            </ActionButton>
          </div>
        </Group>

        <Group title="Household snapshot (derived)">
          <ul className="space-y-1 text-[13px]">
            {MEMBER_ORDER.map((id) => (
              <li key={id} className="flex justify-between">
                <span>{MEMBERS.find((m) => m.id === id)!.name}</span>
                <span className={cx('tabular font-semibold', b[id] > 0 && 'text-pine')}>{formatCents(b[id], 'en', { signed: true })}</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-dashed border-line pt-1 font-bold">
              <span>Household total</span>
              <span className={cx('tabular', total === 0 ? 'text-good' : 'text-bad')} data-testid="presenter-total">
                {formatCents(total, 'en')}
              </span>
            </li>
          </ul>
        </Group>

        <Group title="Second phone" icon={<MonitorSmartphone size={13} aria-hidden />}>
          <label className="flex min-h-10 cursor-pointer items-center gap-2 text-[13px] font-semibold">
            <input
              type="checkbox"
              className="size-4 accent-[#2f6b4f]"
              checked={prefs.showSecondPhone}
              onChange={(e) => dispatch({ type: 'SET_SHOW_SECOND', show: e.target.checked })}
              data-testid="toggle-second-phone"
            />
            Show another roommate’s phone
          </label>
          {prefs.showSecondPhone && (
            <div className="mt-1 flex gap-1.5">
              {MEMBERS.map((m) => (
                <Chip key={m.id} active={prefs.secondViewerId === m.id} onClick={() => dispatch({ type: 'SET_SECOND_VIEWER', memberId: m.id as MemberId })}>
                  <Avatar member={m} size="xs" /> {m.name}
                </Chip>
              ))}
            </div>
          )}
          <p className="mt-1.5 text-[11.5px] text-muted">Both phones read the same in-browser records. This is not device-to-device sync.</p>
        </Group>

        <Group title="Evidence">
          <div className="space-y-1.5">
            <ActionButton onClick={() => onOpenEvidence('validation')} testId="open-validation">
              <FlaskConical size={16} aria-hidden /> Open validation results
            </ActionButton>
            <ActionButton onClick={() => onOpenEvidence('about')} testId="open-about">
              <Info size={16} aria-hidden /> About this PoC & requirement mapping
            </ActionButton>
          </div>
        </Group>

        <Group title="Storage" icon={<Database size={13} aria-hidden />}>
          <p className="text-[12px] text-muted" data-testid="save-status">
            {save.ok ? (
              <>
                Saved to <code className="rounded bg-cream px-1 text-ink">{STORAGE_KEY}</code> · {(save.bytes / 1024).toFixed(1)} KB
                {save.at && ` · ${new Date(save.at).toLocaleTimeString('en-CA')}`}
              </>
            ) : (
              <span className="text-bad">Not saved: {save.error}</span>
            )}
          </p>
          <div className="mt-2">
            {confirmReset ? (
              <div className="rounded-xl bg-bad-50 p-2.5 text-[12.5px] ring-1 ring-bad/25" role="alertdialog" aria-label="Confirm reset">
                <p className="font-semibold">Erase all local demo changes and restore the default populated demo (English, Syed)?</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    data-testid="confirm-reset"
                    onClick={() => {
                      resetDemo();
                      setConfirmReset(false);
                    }}
                    className="min-h-9 rounded-lg bg-bad px-3 font-semibold text-surface"
                  >
                    Reset demo
                  </button>
                  <button type="button" onClick={() => setConfirmReset(false)} className="min-h-9 rounded-lg bg-surface px-3 font-semibold ring-1 ring-line">
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <ActionButton variant="danger" onClick={() => setConfirmReset(true)} testId="reset-demo">
                <RotateCcw size={16} aria-hidden /> Reset demo…
              </ActionButton>
            )}
          </div>
        </Group>
      </div>
    </aside>
  );
}
