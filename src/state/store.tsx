import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, Campaign, PlatformId, Status } from '../types';
import { advanceDays } from '../sim/engine';
import { newAccount } from '../sim/factory';
import { scenarioById } from '../data/scenarios';

const GUEST_KEY = 'ads-sim:v1';
const PROFILE_KEY = 'ads-sim:profile';

type Accounts = Partial<Record<PlatformId, Account>>;

/** Optional, unverified identity. Stored only in this browser. */
export interface Profile {
  email: string;
  name?: string;
}

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());
const keyFor = (p: Profile | null) => (p ? `ads-sim:v1:user:${p.email.toLowerCase()}` : GUEST_KEY);

interface Store {
  accounts: Accounts;
  profile: Profile | null;
  /** Sign up / log in with just an email — no verification. Guest progress carries over to a new profile. */
  signIn: (email: string, name?: string) => void;
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
  const [profile, setProfile] = useState<Profile | null>(loadProfile);
  const [accounts, setAccounts] = useState<Accounts>(() => loadAccounts(keyFor(loadProfile())) ?? {});

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
    signIn: (email, name) => {
      const next: Profile = { email: email.trim().toLowerCase(), name: name?.trim() || undefined };
      // Returning email → restore their saved progress. New email → keep what you've already built as a guest.
      const existing = loadAccounts(keyFor(next));
      setProfile(next);
      setAccounts(existing ?? accounts);
    },
    signOut: () => {
      setProfile(null);
      setAccounts(loadAccounts(GUEST_KEY) ?? {});
    },
    createAccount: (p, id, name) => setAccounts((all) => ({ ...all, [p]: newAccount(p, scenarioById(id), name) })),
    resetAccount: (p) => setAccounts((all) => {
      const next = { ...all };
      delete next[p];
      return next;
    }),
    saveCampaign: (p, c) => update(p, (a) => {
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
    advance: (p, days) => update(p, (a) => advanceDays(a, days)),
  }), [accounts, profile, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
