import { createContext, useContext, useMemo } from 'react';
import { demoToday } from '../domain/dates';
import { balancesOf, suggestTransfers } from '../domain/expenses';
import type { MemberId } from '../domain/types';
import { getTranslator } from '../i18n';
import { useStore } from '../state/store';

export type Tab = 'home' | 'expenses' | 'chores' | 'activity';

export type SheetState =
  | { kind: 'addExpense' }
  | { kind: 'expense'; id: string }
  | { kind: 'settle'; fromUserId?: MemberId; toUserId?: MemberId }
  | { kind: 'addChore' }
  | { kind: 'profile' }
  | null;

export interface PhoneCtx {
  viewerId: MemberId;
  tab: Tab;
  setTab: (t: Tab) => void;
  openSheet: (s: SheetState) => void;
  closeSheet: () => void;
  toast: (msg: string) => void;
}

export const PhoneContext = createContext<PhoneCtx | null>(null);

export function usePhone(): PhoneCtx {
  const c = useContext(PhoneContext);
  if (!c) throw new Error('usePhone outside PhoneApp');
  return c;
}

export function useT() {
  const { state } = useStore();
  return getTranslator(state.prefs.lang);
}

/** Derived, read-only view of the household for one phone. Everything is computed from records. */
export function useHousehold() {
  const { state } = useStore();
  const { viewerId } = usePhone();
  const tr = useT();
  const d = state.data;
  return useMemo(() => {
    const balances = balancesOf(d);
    const transfers = suggestTransfers(balances);
    const today = demoToday(d.currentWeek);
    const member = (id: MemberId) => d.members.find((m) => m.id === id)!;
    /** Display name from the viewer's perspective ("You" for the viewer). */
    const who = (id: MemberId | 'system', capital = true) => {
      if (id === 'system') return tr.t('activity.system');
      if (id === viewerId) return tr.t(capital ? 'common.you' : 'common.youLower');
      return member(id).name;
    };
    return { data: d, balances, transfers, today, member, who, viewer: member(viewerId) };
  }, [d, viewerId, tr]);
}
