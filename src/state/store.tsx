import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Account, Campaign, PlatformId, Status } from '../types';
import { advanceDays } from '../sim/engine';
import { newAccount } from '../sim/factory';
import { scenarioById } from '../data/scenarios';

const KEY = 'ads-sim:v1';

type Accounts = Partial<Record<PlatformId, Account>>;

interface Store {
  accounts: Accounts;
  createAccount: (p: PlatformId, scenarioId: string) => void;
  resetAccount: (p: PlatformId) => void;
  update: (p: PlatformId, fn: (a: Account) => Account) => void;
  saveCampaign: (p: PlatformId, c: Campaign) => void;
  setStatus: (p: PlatformId, ids: string[], status: Status) => void;
  remove: (p: PlatformId, ids: string[]) => void;
  advance: (p: PlatformId, days: number) => void;
}

const Ctx = createContext<Store | null>(null);

function load(): Accounts {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Accounts>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(accounts));
    } catch {
      /* storage full or blocked — the session still works in memory */
    }
  }, [accounts]);

  const update = useCallback((p: PlatformId, fn: (a: Account) => Account) => {
    setAccounts((all) => (all[p] ? { ...all, [p]: fn(all[p]!) } : all));
  }, []);

  const store = useMemo<Store>(() => ({
    accounts,
    update,
    createAccount: (p, id) => setAccounts((all) => ({ ...all, [p]: newAccount(p, scenarioById(id)) })),
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
  }), [accounts, update]);

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error('StoreProvider missing');
  return s;
}
