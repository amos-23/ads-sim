import { useState } from 'react';
import { PLATFORMS, PLATFORM_ORDER } from '../platforms/config';
import { useStore } from '../state/store';
import { scenarioById, SCENARIOS } from '../data/scenarios';
import { adIds, sumStats } from '../sim/engine';
import { fmtMoney } from '../sim/metrics';
import { PlatformMark } from './ui';
import { AuthModal } from './AuthModal';
import type { PlatformId } from '../types';

export function Home({ open }: { open: (p: PlatformId) => void }) {
  const { accounts, profile, signOut, sync } = useStore();
  const [auth, setAuth] = useState(false);
  return (
    <div className="home">
      <header className="home-nav">
        <div className="home-logo"><span>📈</span>AdsSim</div>
        <div className="spacer" />
        <a href="#how">How it works</a>
        {profile ? (
          <div className="home-user">
            <span className="home-avatar">{(profile.name || profile.email)[0].toUpperCase()}</span>
            <span className="home-email">{profile.name || profile.email}</span>
            <span className="muted small" title={sync === 'offline' ? 'Couldn’t reach the server. Your progress is kept in this browser and will sync when it can.' : undefined}>
              {sync === 'saving' ? 'Saving…' : sync === 'saved' ? 'Saved' : sync === 'offline' ? 'Offline' : 'This browser only'}
            </span>
            <button className="link" onClick={signOut}>Sign out</button>
          </div>
        ) : (
          <button className="btn home-signup" onClick={() => setAuth(true)}>Sign up</button>
        )}
      </header>
      {auth && <AuthModal onClose={() => setAuth(false)} />}
      <section className="hero">
        <div className="hero-pill">Ad-buying flight simulator</div>
        <h1>Practice running ads<br />without spending a cent.</h1>
        <p>Build real campaigns in faithful replicas of the ad platforms marketers use every day. Set budgets, target audiences, write creative, then fast-forward time and see how your results play out.</p>
        <p className="hero-note">No sign-up needed — just pick a platform below and start.</p>
      </section>
      <section className="platform-pick">
        <h2>Choose a platform to start</h2>
        <div className="platform-grid">
          {PLATFORM_ORDER.map((id) => {
            const p = PLATFORMS[id];
            const acc = accounts[id];
            const st = acc ? sumStats(acc, acc.campaigns.flatMap((c) => adIds(c))) : null;
            return (
              <button key={id} className={`platform-card pc-${id}`} onClick={() => open(id)}>
                <div className="pc-top"><PlatformMark id={id} size={44} /><div><b>{p.name}</b><small>{p.productName}</small></div></div>
                <div className="pc-tag">{p.tagline}</div>
                <p>{p.description}</p>
                <div className="pc-foot">
                  {acc ? <span>{scenarioById(acc.scenarioId).emoji} {acc.accountName} · Day {acc.day} · {fmtMoney(st!.spend, 0)} spent</span> : <span className="muted">Not started</span>}
                  <span className="pc-go">{acc ? 'Continue →' : 'Start →'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
      <section className="how" id="how">
        <h2>How it works</h2>
        <div className="how-grid">
          <div><span>1</span><b>Pick a platform</b><p>Jump straight in and advertise your own business, or take a guided challenge with one of {SCENARIOS.length} sample businesses — a coffee brand, a fitness app, a skincare launch or B2B software — each with a target cost per result.</p></div>
          <div><span>2</span><b>Build your campaign</b><p>Objectives, budgets, bidding, audiences, placements, keywords and creative — the same decisions, in the same order, as the real tools.</p></div>
          <div><span>3</span><b>Fast-forward time</b><p>The simulator models auctions, learning phases, audience saturation, ad fatigue, Quality Score and ad review. Advance a day or a week at a time.</p></div>
          <div><span>4</span><b>Optimise with a coach</b><p>Get feedback like a senior media buyer would give: what’s broken, why your CPA is high, and what to test next.</p></div>
        </div>
      </section>
      <footer className="home-foot">AdsSim is an independent educational simulator. It is not affiliated with, endorsed by, or connected to Meta, TikTok, Google, X or OpenAI. All numbers are simulated. Progress is saved in your browser.</footer>
    </div>
  );
}
