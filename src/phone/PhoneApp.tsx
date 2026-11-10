import { Home, ListChecks, Receipt, History, type LucideIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Lang, MemberId } from '../domain/types';
import { ActivityScreen } from '../screens/ActivityScreen';
import { ChoresScreen } from '../screens/ChoresScreen';
import { ExpensesScreen } from '../screens/ExpensesScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { AddChoreSheet } from '../sheets/AddChoreSheet';
import { AddExpenseSheet } from '../sheets/AddExpenseSheet';
import { ExpenseDetailSheet } from '../sheets/ExpenseDetailSheet';
import { ProfileSheet } from '../sheets/ProfileSheet';
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
  const scroller = useRef<HTMLDivElement>(null);

  const setTab = useCallback((t: Tab) => {
    setSheet(null);
    setTabState(t);
    scroller.current?.scrollTo({ top: 0 });
  }, []);
  const toast = useCallback((text: string) => setToastMsg({ id: Date.now(), text }), []);
  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(null), 2400);
    return () => clearTimeout(t);
  }, [toastMsg]);

  const ctx: PhoneCtx = useMemo(
    () => ({ viewerId, tab, setTab, openSheet: setSheet, closeSheet: () => setSheet(null), toast }),
    [viewerId, tab, setTab, toast],
  );

  return (
    <PhoneContext.Provider value={ctx}>
      <div className="relative flex h-full flex-col bg-surface" data-phone={instance} data-viewer={viewerId}>
        <AppHeader />
        <main ref={scroller} className="scrollbar-none relative flex-1 overflow-y-auto overscroll-contain bg-surface pt-1">
          {tab === 'home' && <HomeScreen />}
          {tab === 'expenses' && <ExpensesScreen />}
          {tab === 'chores' && <ChoresScreen />}
          {tab === 'activity' && <ActivityScreen />}
        </main>
        <BottomNav />

        {sheet?.kind === 'addExpense' && <AddExpenseSheet />}
        {sheet?.kind === 'expense' && <ExpenseDetailSheet id={sheet.id} />}
        {sheet?.kind === 'settle' && <SettleUpSheet fromUserId={sheet.fromUserId} toUserId={sheet.toUserId} />}
        {sheet?.kind === 'addChore' && <AddChoreSheet />}
        {sheet?.kind === 'profile' && <ProfileSheet />}

        {toastMsg && (
          <div
            key={toastMsg.id}
            role="status"
            className="pointer-events-none absolute left-1/2 top-16 z-40 animate-toast whitespace-nowrap rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-surface shadow-sheet"
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
  const ctx = usePhone();
  const setLang = (lang: Lang) => dispatch({ type: 'SET_LANG', lang });
  return (
    <header className="flex items-center gap-2.5 border-b border-line/70 bg-surface px-4 pb-2.5 pt-2">
      <span className="grid size-9 place-items-center rounded-xl bg-mustard" aria-hidden>
        <svg viewBox="0 0 64 64" className="size-6">
          <path d="M14 34 32 18l18 16v14a3 3 0 0 1-3 3H17a3 3 0 0 1-3-3z" fill="#1C1A17" />
          <rect x="27" y="37" width="10" height="14" rx="2" fill="#D9A21B" />
        </svg>
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[15px] font-extrabold">{h.data.household.name}</p>
        <p className="truncate text-[11.5px] font-medium text-muted">Room Sync · {h.data.household.city}</p>
      </div>
      <div role="radiogroup" aria-label={tr.t('common.language')} className="flex rounded-full bg-cream p-0.5 ring-1 ring-line">
        {(['en', 'fr'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            role="radio"
            aria-checked={state.prefs.lang === l}
            onClick={() => setLang(l)}
            className={cx(
              'min-h-7 min-w-8 rounded-full px-2 text-[11px] font-bold uppercase transition',
              state.prefs.lang === l ? 'bg-ink text-surface' : 'text-muted hover:text-ink',
            )}
          >
            {l}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => ctx.openSheet({ kind: 'profile' })}
        aria-label={tr.t('common.openSettings')}
        className="rounded-full ring-2 ring-transparent transition hover:ring-mustard"
      >
        <Avatar member={h.viewer} size="sm" />
      </button>
    </header>
  );
}

function BottomNav() {
  const tr = useT();
  const { tab, setTab, viewerId } = usePhone();
  const h = useHousehold();
  const myOpen = h.data.assignments.filter((a) => a.assigneeId === viewerId && a.status === 'pending' && a.week <= h.data.currentWeek).length;
  return (
    <nav className="grid grid-cols-4 border-t border-line bg-surface/95 px-2 pb-[max(env(safe-area-inset-bottom),18px)] pt-1.5 backdrop-blur" aria-label="Main">
      {TABS.map(({ id, Icon, key }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            aria-current={active ? 'page' : undefined}
            className="relative flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold"
          >
            <span className={cx('grid h-7 w-12 place-items-center rounded-full transition', active ? 'bg-mustard text-ink' : 'text-muted')}>
              <Icon size={19} strokeWidth={active ? 2.4 : 2} aria-hidden />
            </span>
            <span className={active ? 'text-ink' : 'text-muted'}>{tr.t(key)}</span>
            {id === 'chores' && myOpen > 0 && (
              <span className="absolute right-[18%] top-0.5 grid min-w-4 place-items-center rounded-full bg-ink px-1 text-[10px] font-bold text-surface">
                {myOpen}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}

