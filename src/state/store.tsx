import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode } from 'react';
import { demoNow } from '../domain/dates';
import type { AppState } from '../domain/types';
import { appReducer, type AppAction } from './reducer';
import {
  backupUnreadable,
  browserStore,
  clearSaved,
  loadState,
  saveState,
  STORAGE_KEY,
  type LoadResult,
  type LoadStatus,
} from './storage';

export interface SaveInfo {
  ok: boolean;
  bytes: number;
  at: string | null;
  error?: string;
}

interface StoreValue {
  state: AppState;
  dispatch: (a: AppAction) => void;
  loadStatus: LoadStatus;
  loadDetail?: string;
  save: SaveInfo;
  /** Clear localStorage and return to the default populated demo. */
  resetDemo: () => void;
  dismissLoadNotice: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const store = useMemo(() => browserStore(), []);
  const initial = useRef<LoadResult | null>(null);
  if (initial.current === null) initial.current = loadState(store);

  const [state, dispatch] = useReducer(appReducer, initial.current.state);
  const [loadStatus, setLoadStatus] = useState<LoadStatus>(initial.current.status);
  const [loadDetail, setLoadDetail] = useState(initial.current.detail);
  const [save, setSave] = useState<SaveInfo>({ ok: true, bytes: 0, at: null });
  const lastWritten = useRef<string | null>(null);
  const skipNextSave = useRef(false);

  // Before the first write, keep a backup copy of any unreadable saved data.
  useEffect(() => {
    if (store && (initial.current?.status === 'corrupt' || initial.current?.status === 'incompatible')) backupUnreadable(store);
  }, [store]);

  // Persist every state change to localStorage.
  useEffect(() => {
    if (!store) {
      setSave({ ok: false, bytes: 0, at: null, error: 'localStorage unavailable' });
      return;
    }
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const res = saveState(store, state);
    if (res.ok) {
      try {
        lastWritten.current = store.getItem(STORAGE_KEY);
      } catch {
        lastWritten.current = null;
      }
      setSave({ ok: true, bytes: res.bytes, at: new Date().toISOString() });
    } else setSave({ ok: false, bytes: 0, at: null, error: res.error });
  }, [state, store]);

  // Keep several browser tabs of the demo in step (same device only).
  useEffect(() => {
    if (!store) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null || e.newValue === lastWritten.current) return;
      const res = loadState(store);
      if (res.status === 'ok') {
        skipNextSave.current = true;
        dispatch({ type: 'HYDRATE', state: res.state });
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [store]);

  const resetDemo = useCallback(() => {
    if (store) clearSaved(store);
    dispatch({ type: 'RESET' });
    setLoadStatus('ok');
    setLoadDetail(undefined);
  }, [store]);

  const dismissLoadNotice = useCallback(() => setLoadStatus('ok'), []);

  const value = useMemo(
    () => ({ state, dispatch, loadStatus, loadDetail, save, resetDemo, dismissLoadNotice }),
    [state, loadStatus, loadDetail, save, resetDemo, dismissLoadNotice],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const v = useContext(StoreContext);
  if (!v) throw new Error('useStore must be used inside StoreProvider');
  return v;
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Timestamp on the demo clock for the current demo week. */
export function nowOnDemoClock(week: number): string {
  return demoNow(week).toISOString();
}
