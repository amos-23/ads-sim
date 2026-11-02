import type { Account, PlatformId } from './types';

/** The shared backend (served by the events app). Override with VITE_API_URL, e.g. http://localhost:3000 when developing. */
export const API_URL = ((import.meta.env.VITE_API_URL as string | undefined) ?? 'https://events.latars.xyz').replace(/\/$/, '');

const TOKEN_KEY = 'ads-sim:token';

export type Accounts = Partial<Record<PlatformId, Account>>;
export interface Progress { state: Accounts; updatedAt: string }
export interface ServerUser { id: string; email: string; name: string | null }

export const getToken = () => { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } };
export const setToken = (t: string | null) => {
  try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch { /* blocked storage: stay local */ }
};

/** Thrown when the server says this device is no longer signed in. */
export class SignedOut extends Error {}

async function call(path: string, init: RequestInit & { token?: string | null } = {}) {
  const { token, ...rest } = init;
  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
  });
  if (res.status === 401) throw new SignedOut();
  if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Request failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

export const apiSignIn = (email: string, name: string | undefined, state: Accounts) =>
  call('/api/ads/signin', { method: 'POST', body: JSON.stringify({ email, name, state }) }) as Promise<{ token: string; user: ServerUser; progress: Progress | null; adopted: boolean }>;

export const apiLoad = (token: string) => call('/api/ads/progress', { token }) as Promise<{ user: ServerUser; progress: Progress | null }>;

export const apiSave = (token: string, state: Accounts) =>
  call('/api/ads/progress', { method: 'PUT', token, body: JSON.stringify({ state }) }) as Promise<{ ok: true; updatedAt: string }>;

export const apiSignOut = (token: string) => call('/api/ads/signout', { method: 'POST', token }).catch(() => null);

/** Anonymous usage events: no cookies, no email, and nothing is sent if the browser says Do Not Track. */
export function track(name: string, platform?: PlatformId, props?: Record<string, string | number | boolean>) {
  try {
    if (navigator.doNotTrack === '1') return;
    void fetch(`${API_URL}/api/ads/track`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain', ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify({ name, platform, props }),
    }).catch(() => undefined);
  } catch { /* analytics must never break the app */ }
}
