import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Account, Campaign, PlatformId, Status } from '../types';
import { advanceDays } from '../sim/engine';
import { newAccount } from '../sim/factory';
import { scenarioById } from '../data/scenarios';
import { apiLoad, apiSave, apiSignIn, apiSignOut, apiSignUp, getToken, setToken, SignedOut, track, type Accounts } from '../api';

const GUEST_KEY = 'ads-sim:v1';
const PROFILE_KEY = 'ads-sim:profile';

const SYNCED_KEY = 'ads-sim:synced';   // server time of the progress this browser last saved or received
const CHANGED_KEY = 'ads-sim:changed'; // when this browser last changed anything

const lsGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const lsSet = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* blocked storage */ } };

export type SyncStatus = 'off' | 'saving' | 'saved' | 'offline';

/** Optional, unverified identity. Cached in this browser and saved to the AdsSim backend. */
export interface Profile {
  email: string;
  name?: string;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const keyFor = (p: Profile | null) => (p ? `ads-sim:v1:user:${p.email.toLowerCase()}` : GUEST_KEY);

interface Store {
  accounts: Accounts;
  profile: Profile | null;
  /** Whether this browser's progress is being saved to the backend. */
  sync: SyncStatus;
  /** Sign up or sign in with an email and password. Resolves to an error message, or null on success. Guest progress carries over to a new account. */
  signIn: (mode: 'signup' | 'signin', email: string, password: string, name?: string) => Promise<string | null>;
  signOut: () => void;
  createAccount: (p: PlatformId, scenarioId: string, name?: string) => void;
  resetAccount: (p: PlatformId) => void;
  update: (p: PlatformId, fn: (a: Account) => Account) => void;
  saveCampaign: (p: PlatformId, c: Campaign) => void;
  setStatus: (p: PlatformId, ids: string[], status: Status) => void;
  remove: (p: PlatformId, ids: string[]) => void;
  advance: (p: PlatformId, days: number) => void;
}

const Ctx = createContext<Store | null>(null);

function loadAccounts(key: string): Accounts | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function loadProfile(): Profile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return p && typeof p.email === 'string' ? p : null;
  } catch {
    return null;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  // A profile is only real while this device holds a session token (older versions kept an email with no password).
  const [profile, setProfile] = useState<Profile | null>(() => (getToken() ? loadProfile() : null));
  const [accounts, setAccounts] = useState<Accounts>(() => loadAccounts(keyFor(getToken() ? loadProfile() : null)) ?? {});

  const [sync, setSync] = useState<SyncStatus>(() => (getToken() ? 'saved' : 'off'));
  const lastSent = useRef<string>('');

  // Note when this browser changed something, so a stale copy on the server never overwrites newer local work.
  const changed = useRef(false);
  useEffect(() => {
    if (changed.current) lsSet(CHANGED_KEY, new Date().toISOString());
    changed.current = true;
  }, [accounts]);

  // Save to the backend a moment after the last change (only when signed in; the browser copy below is always kept).
  useEffect(() => {
    const token = getToken();
    if (!token || !profile) return;
    const timer = setTimeout(async () => {
      const body = JSON.stringify(accounts);
      if (body === lastSent.current) return;
      setSync('saving');
      try {
        const r = await apiSave(token, accounts);
        lastSent.current = body;
        lsSet(SYNCED_KEY, r.updatedAt);
        setSync('saved');
      } catch (e) {
        if (e instanceof SignedOut) { setToken(null); setSync('off'); } else setSync('offline');
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [accounts, profile]);

  // On load, pick up progress saved from another device, unless this browser has newer unsaved work.
  useEffect(() => {
    const token = getToken();
    if (!token || !loadProfile()) return;
    apiLoad(token).then(({ progress }) => {
      if (!progress) return;
      const unsaved = (lsGet(CHANGED_KEY) ?? '') > (lsGet(SYNCED_KEY) ?? '');
      if (unsaved || progress.updatedAt <= (lsGet(SYNCED_KEY) ?? '')) return;
      lastSent.current = JSON.stringify(progress.state);
      lsSet(SYNCED_KEY, progress.updatedAt);
      setAccounts(progress.state);
    }).catch((e) => { if (e instanceof SignedOut) { setToken(null); setSync('off'); } else setSync('offline'); });
  }, []);

  useEffect(() => { track('view'); }, []);

  useEffect(() => {
    try {
      localStorage.setItem(keyFor(profile), JSON.stringify(accounts));
      if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
      else localStorage.removeItem(PROFILE_KEY);
    } catch {
      /* storage full or blocked — the session still works in memory */
    }
  }, [accounts, profile]);

  const update = useCallback((p: PlatformId, fn: (a: Account) => Account) => {
    setAccounts((all) => (all[p] ? { ...all, [p]: fn(all[p]!) } : all));
  }, []);

  const store = useMemo<Store>(() => ({
    accounts,
    profile,
    update,
    sync,
    signIn: async (mode, email, password, name) => {
      const address = email.trim().toLowerCase();
      try {
        const r = mode === 'signup'
          ? await apiSignUp(address, password, name?.trim() || undefined, accounts)
          : await apiSignIn(address, password);
        setToken(r.token);
        setProfile({ email: r.user.email, name: r.user.name ?? (name?.trim() || undefined) });
        if (r.progress) {
          // Their saved progress replaces what this browser had.
          lastSent.current = JSON.stringify(r.progress.state);
          lsSet(SYNCED_KEY, r.progress.updatedAt);
          setAccounts(r.progress.state);
        }
        setSync('saved');
        track(mode);
        return null;
      } catch (e) {
        return !(e instanceof Error) || e instanceof TypeError ? 'Can’t reach the server right now. Try again in a moment.' : e.message;
      }
    },
    signOut: () => {
      const token = getToken();
      if (token) void apiSignOut(token);
      setToken(null);
      setSync('off');
      setProfile(null);
      setAccounts(loadAccounts(GUEST_KEY) ?? {});
    },
    createAccount: (p, id, name) => {
      track('platform_start', p, { scenario: id });
      setAccounts((all) => ({ ...all, [p]: newAccount(p, scenarioById(id), name) }));
    },
    resetAccount: (p) => {
      track('reset', p);
      setAccounts((all) => {
        const next = { ...all };
        delete next[p];
        return next;
      });
    },
    saveCampaign: (p, c) => update(p, (a) => {
      track('campaign_saved', p, { objective: c.objective ?? '' });
      const exists = a.campaigns.some((x) => x.id === c.id);
      return { ...a, campaigns: exists ? a.campaigns.map((x) => (x.id === c.id ? c : x)) : [c, ...a.campaigns] };
    }),
    setStatus: (p, ids, status) => update(p, (a) => ({
      ...a,
      campaigns: a.campaigns.map((c) => ({
        ...c,
        status: ids.includes(c.id) && c.status !== 'completed' ? status : c.status,
        adSets: c.adSets.map((s) => ({
          ...s,
          status: ids.includes(s.id) ? status : s.status,
          ads: s.ads.map((ad) => (ids.includes(ad.id) && ad.status !== 'rejected' && ad.status !== 'in_review' ? { ...ad, status } : ad)),
        })),
      })),
    })),
    remove: (p, ids) => update(p, (a) => ({
      ...a,
      campaigns: a.campaigns
        .filter((c) => !ids.includes(c.id))
        .map((c) => ({ ...c, adSets: c.adSets.filter((s) => !ids.includes(s.id)).map((s) => ({ ...s, ads: s.ads.filter((ad) => !ids.includes(ad.id)) })) })),
    })),
    advance: (p, days) => {
      track('days_advanced', p, { days });
      update(p, (a) => advanceDays(a, days));
    },
  }), [accounts, profile, sync, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
