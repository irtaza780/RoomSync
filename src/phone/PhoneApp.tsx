import { History, Home, ListChecks, Plus, Receipt, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type UIEvent } from 'react';
import type { Lang, MemberId } from '../domain/types';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ChoresScreen } from '../screens/ChoresScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AddChoreSheet } from '../sheets/AddChoreSheet';
import { AddExpenseSheet } from '../sheets/AddExpenseSheet';
import { ExpenseDetailSheet } from '../sheets/ExpenseDetailSheet';
import { ProfileSheet } from '../sheets/ProfileSheet';
import { RewardsSheet } from '../sheets/RewardsSheet';
import { SettleUpSheet } from '../sheets/SettleUpSheet';
import { useStore } from '../state/store';
import { Avatar, cx } from '../ui/primitives';
import { PhoneContext, useHousehold, usePhone, useT, type PhoneCtx, type SheetState, type Tab } from './context';

const TABS: { id: Tab; Icon: LucideIcon; key: 'nav.home' | 'nav.expenses' | 'nav.chores' | 'nav.activity' }[] = [
  { id: 'home', Icon: Home, key: 'nav.home' },
  { id: 'expenses', Icon: Receipt, key: 'nav.expenses' },
  { id: 'chores', Icon: ListChecks, key: 'nav.chores' },
  { id: 'activity', Icon: History, key: 'nav.activity' },
];

/** One roommate's phone. Several PhoneApps can render side by side over the same shared store. */
export function PhoneApp({ viewerId, instance }: { viewerId: MemberId; instance: string }) {
  const [tab, setTabState] = useState<Tab>('home');
  const [sheet, setSheet] = useState<SheetState>(null);
  const [toastMsg, setToastMsg] = useState<{ id: number; text: string } | null>(null);
  const [compact, setCompact] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const lastY = useRef(0);

  const setTab = useCallback((t: Tab) => {
    setSheet(null);
    setTabState(t);
    setCompact(false);
    scroller.current?.scrollTo({ top: 0 });
    lastY.current = 0;
  }, []);
  const toast = useCallback((text: string) => setToastMsg({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  // Tab bar minimises while scrolling down and expands on scroll up or near the top (iOS 26 / One UI style).
  const onScroll = (e: UIEvent<HTMLElement>) => {
    const y = e.currentTarget.scrollTop;
    const dy = y - lastY.current;
    if (y < 32) setCompact(false);
    else if (dy > 6) setCompact(true);
    else if (dy < -6) setCompact(false);
    lastY.current = y;
  };

  const ctx: PhoneCtx = useMemo(
    () => ({ viewerId, tab, setTab, openSheet: setSheet, closeSheet: () => setSheet(null), toast }),
    [viewerId, tab, setTab, toast],
  );

  return (
    <PhoneContext.Provider value={ctx}>
      <div className="relative flex h-full flex-col bg-surface" data-phone={instance} data-viewer={viewerId}>
        <AppHeader />
        <main ref={scroller} onScroll={onScroll} className="scrollbar-none relative flex-1 overflow-y-auto overscroll-contain" data-testid="scroller">
          {tab === 'home' && <HomeScreen />}
          {tab === 'expenses' && <ExpensesScreen />}
          {tab === 'chores' && <ChoresScreen />}
          {tab === 'activity' && <ActivityScreen />}
        </main>
        <FloatingNav compact={compact} onExpand={() => setCompact(false)} />

        {sheet?.kind === 'addExpense' && <AddExpenseSheet />}
        {sheet?.kind === 'expense' && <ExpenseDetailSheet id={sheet.id} />}
        {sheet?.kind === 'settle' && <SettleUpSheet fromUserId={sheet.fromUserId} toUserId={sheet.toUserId} />}
        {sheet?.kind === 'addChore' && <AddChoreSheet />}
        {sheet?.kind === 'profile' && <ProfileSheet />}
        {sheet?.kind === 'rewards' && <RewardsSheet />}

        {toastMsg && (
          <div
            key={toastMsg.id}
            role="status"
            className="pointer-events-none absolute left-1/2 top-14 z-50 animate-toast whitespace-nowrap rounded-full bg-pine-900 px-4 py-2 text-[12.5px] font-semibold text-white shadow-float"
          >
            {toastMsg.text}
          </div>
        )}
      </div>
    </PhoneContext.Provider>
  );
}

function AppHeader() {
  const tr = useT();
  const h = useHousehold();
  const { state, dispatch } = useStore();
  const { openSheet } = usePhone();
  return (
    <header className="flex items-center gap-2.5 bg-surface px-5 pb-1.5 pt-1">
      <span className="grid size-7 place-items-center rounded-[9px] bg-pine" aria-hidden>
        <svg viewBox="0 0 64 64" className="size-[18px]">
          <path d="M14 34 32 18l18 16v14a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#D9A21B" />
          <rect x="27" y="37" width="10" height="14" rx="2" fill="#2F6B4F" />
        </svg>
      </span>
      <p className="min-w-0 flex-1 truncate text-[14px] font-bold">
        {h.data.household.name}
        <span className="ml-1.5 font-medium text-muted">· {h.data.household.city}</span>
      </p>
      <div role="radiogroup" aria-label={tr.t('common.language')} className="flex rounded-full bg-cream p-0.5">
        {(['en', 'fr'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={state.prefs.lang === l}
            onClick={() => dispatch({ type: 'SET_LANG', lang: l })}
            className={cx(
              'min-h-7 min-w-8 rounded-full px-2 text-[10.5px] font-bold uppercase transition',
              state.prefs.lang === l ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => openSheet({ kind: 'profile' })} aria-label={tr.t('common.openSettings')} className="grid size-9 place-items-center rounded-full">
        <Avatar member={h.viewer} size="sm" />
      </button>
    </header>
  );
}

/**
 * Floating "glass" tab bar. Expanded: all four tabs with labels. Compact: shrinks to the
 * active tab's icon (tap to expand). A separate round button gives the contextual add action.
 */
function FloatingNav({ compact, onExpand }: { compact: boolean; onExpand: () => void }) {
  const tr = useT();
  const { tab, setTab, viewerId, openSheet } = usePhone();
  const h = useHousehold();
  const myOpen = h.data.assignments.filter((a) => a.assigneeId === viewerId && a.status === 'pending' && a.week <= h.data.currentWeek).length;
  const addChore = tab === 'chores';

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 flex items-end justify-between gap-2 px-4 pb-7" data-testid="tabbar" data-compact={compact}>
      <nav
        aria-label="Main"
        onClick={compact ? onExpand : undefined}
        className={cx(
          'pointer-events-auto flex items-center rounded-full bg-surface/80 p-1 shadow-float ring-1 ring-black/5 backdrop-blur-xl backdrop-saturate-150 transition-all duration-300 ease-out',
          compact ? 'h-12' : 'h-[60px] flex-1',
        )}
      >
        {TABS.map(({ id, Icon, key }) => {
          const active = tab === id;
          const hidden = compact && !active;
          return (
            <button
              key={id}
              type="button"
              tabIndex={hidden ? -1 : 0}
              aria-hidden={hidden || undefined}
              onClick={(e) => {
                if (compact) {
                  e.stopPropagation();
                  onExpand();
                  return;
                }
                setTab(id);
              }}
              aria-current={active ? 'page' : undefined}
              aria-label={compact ? tr.t('nav.expand') : undefined}
              className={cx(
                'relative flex h-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-full transition-all duration-300 ease-out',
                hidden ? 'w-0 opacity-0' : compact ? 'w-10' : 'flex-1 opacity-100',
                active && !compact && 'bg-pine-50',
              )}
            >
              <Icon size={compact ? 20 : 19} strokeWidth={active ? 2.4 : 2} className={active ? 'text-pine' : 'text-ink-2'} aria-hidden />
              <span
                className={cx(
                  'whitespace-nowrap text-[10px] font-semibold transition-all duration-200',
                  compact ? 'h-0 opacity-0' : 'h-3.5 opacity-100',
                  active ? 'text-pine' : 'text-muted',
                )}
              >
                {tr.t(key)}
              </span>
              {id === 'chores' && myOpen > 0 && !hidden && (
                <span className={cx('absolute grid min-w-4 place-items-center rounded-full bg-mustard px-1 text-[9.5px] font-bold text-ink', compact ? 'right-0.5 top-0.5' : 'right-[18%] top-1')}>
                  {myOpen}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={() => openSheet({ kind: addChore ? 'addChore' : 'addExpense' })}
        aria-label={tr.t(addChore ? 'nav.addChore' : 'nav.addExpense')}
        title={tr.t(addChore ? 'nav.addChore' : 'nav.addExpense')}
        className={cx(
          'pointer-events-auto grid shrink-0 place-items-center rounded-full bg-pine text-white shadow-float transition-all duration-300 hover:bg-pine-700',
          compact ? 'size-12' : 'size-[60px]',
        )}
        data-testid="nav-add"
      >
        <Plus size={compact ? 20 : 22} strokeWidth={2.4} aria-hidden />
      </button>
    </div>
  );
}
