import { computeBalances, householdTotal, isConsistentExpense } from '../domain/expenses';
import { MEMBER_ORDER, type AppState, type MemberId } from '../domain/types';
import { initialAppState } from './reducer';

/** Versioned localStorage key. Bump the suffix if the persisted shape changes incompatibly. */
export const STORAGE_KEY = 'room-sync-demo-v1';
export const BACKUP_KEY = 'room-sync-demo-v1-unreadable-backup';
export const STORAGE_VERSION = 1;

export interface PersistedV1 {
  version: 1;
  savedAt: string;
  state: AppState;
}

/** Minimal Storage interface so persistence can be tested against an in-memory store. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export class MemoryStore implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

export type LoadStatus = 'ok' | 'missing' | 'corrupt' | 'incompatible' | 'unavailable';

export interface LoadResult {
  status: LoadStatus;
  state: AppState;
  detail?: string;
}

const isMember = (v: unknown): v is MemberId => typeof v === 'string' && (MEMBER_ORDER as readonly string[]).includes(v);
const isInt = (v: unknown): v is number => typeof v === 'number' && Number.isSafeInteger(v);
const isStr = (v: unknown): v is string => typeof v === 'string';
const isArr = Array.isArray;

/** Structural validation of persisted state. Returns a reason string when invalid. */
export function validatePersistedState(s: unknown): string | null {
  if (!s || typeof s !== 'object') return 'state is not an object';
  const st = s as AppState;
  if (st.scenario !== 'populated' && st.scenario !== 'clean') return 'unknown scenario';
  const p = st.prefs;
  if (!p || (p.lang !== 'en' && p.lang !== 'fr')) return 'invalid language preference';
  if (!isMember(p.activeMemberId) || !isMember(p.secondViewerId)) return 'invalid active member';
  if (typeof p.showSecondPhone !== 'boolean') return 'invalid second-phone preference';
  const d = st.data;
  if (!d || typeof d !== 'object') return 'missing household data';
  if (!isInt(d.currentWeek) || d.currentWeek < 1 || !isInt(d.seq)) return 'invalid demo week';
  if (!d.household || !isStr(d.household.name)) return 'invalid household';
  if (!isArr(d.members) || d.members.length !== 3 || !d.members.every((m) => isMember(m?.id) && isStr(m.name)))
    return 'invalid members';
  for (const k of ['expenses', 'settlements', 'chores', 'assignments', 'activity'] as const)
    if (!isArr(d[k])) return `${k} is not a list`;
  for (const e of d.expenses) {
    if (!e || !isStr(e.id) || !isStr(e.title) || !isArr(e.splits) || !isConsistentExpense(e)) return 'inconsistent expense record';
  }
  for (const x of d.settlements) {
    if (!x || !isMember(x.fromUserId) || !isMember(x.toUserId) || !isInt(x.amountCents) || x.amountCents <= 0)
      return 'invalid settle-up record';
  }
  for (const c of d.chores) {
    if (!c || !isStr(c.id) || !isStr(c.title) || !isArr(c.assigneeOrder) || !isInt(c.currentIndex)) return 'invalid chore';
  }
  for (const a of d.assignments) {
    if (!a || !isStr(a.id) || !isStr(a.choreId) || !isInt(a.week) || !isMember(a.assigneeId) || (a.status !== 'pending' && a.status !== 'done'))
      return 'invalid assignment';
  }
  for (const a of d.activity) if (!a || !isStr(a.type) || !isInt(a.seq)) return 'invalid activity entry';
  if (householdTotal(computeBalances(d.expenses, d.settlements)) !== 0) return 'balances do not sum to zero';
  return null;
}

export function loadState(store: KeyValueStore | null): LoadResult {
  if (!store) return { status: 'unavailable', state: initialAppState(), detail: 'localStorage is not available' };
  let raw: string | null;
  try {
    raw = store.getItem(STORAGE_KEY);
  } catch (err) {
    return { status: 'unavailable', state: initialAppState(), detail: String(err) };
  }
  if (raw === null) return { status: 'missing', state: initialAppState() };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', state: initialAppState(), detail: 'saved data is not valid JSON' };
  }
  const env = parsed as Partial<PersistedV1>;
  if (!env || typeof env !== 'object' || env.version !== STORAGE_VERSION)
    return { status: 'incompatible', state: initialAppState(), detail: `unsupported version ${String(env?.version)}` };
  const reason = validatePersistedState(env.state);
  if (reason) return { status: 'corrupt', state: initialAppState(), detail: reason };
  return { status: 'ok', state: env.state as AppState };
}

export function serializeState(state: AppState, savedAt = new Date().toISOString()): string {
  const env: PersistedV1 = { version: 1, savedAt, state };
  return JSON.stringify(env);
}

export function saveState(store: KeyValueStore, state: AppState): { ok: true; bytes: number } | { ok: false; error: string } {
  try {
    const json = serializeState(state);
    store.setItem(STORAGE_KEY, json);
    return { ok: true, bytes: json.length };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Keep a copy of unreadable data before it is overwritten, so nothing is silently lost. */
export function backupUnreadable(store: KeyValueStore): void {
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (raw !== null) store.setItem(BACKUP_KEY, raw);
  } catch {
    /* ignore */
  }
}

export function clearSaved(store: KeyValueStore): void {
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function browserStore(): KeyValueStore | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const probe = '__room_sync_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return null;
  }
}
