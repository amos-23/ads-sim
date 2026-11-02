/** Deterministic PRNG so the same campaign on the same day always produces the same numbers. */
export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rng(seed: string): () => number {
  let a = hashString(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Round a fractional expectation randomly so small numbers still produce occasional results. */
export function stochasticRound(x: number, r: () => number): number {
  if (x <= 0) return 0;
  const f = Math.floor(x);
  return f + (r() < x - f ? 1 : 0);
}

export const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

let counter = 0;
export const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${(counter++).toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
