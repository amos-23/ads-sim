import { useState } from 'react';
import type { Campaign, Creative, Keyword } from '../types';
import type { Scenario } from '../data/scenarios';
import { MediaBox } from '../components/Media';

const domainOf = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'example.com';
  }
};

const Avatar = ({ s, size = 36 }: { s: Scenario; size?: number }) => (
  <span className="pv-avatar" style={{ width: size, height: size, fontSize: size * 0.55 }}>{s.emoji}</span>
);

const truncate = (t: string, n: number) => (t.length > n ? t.slice(0, n).trimEnd() : null);

function renderText(t: string) {
  return t.split(/(\s+)/).map((w, i) => (/^#\w+/.test(w) || /^@\w+/.test(w) ? <span key={i} className="pv-tag">{w}</span> : w));
}

/* ---------------------------------- Meta ---------------------------------- */

export function MetaPreview({ c, s }: { c: Creative; s: Scenario }) {
  const [pl, setPl] = useState<'fb_feed' | 'ig_feed' | 'ig_story' | 'reels'>('fb_feed');
  const short = truncate(c.primaryText, 125);
  return (
    <div className="pv pv-meta">
      <div className="pv-tabs">
        {([['fb_feed', 'Facebook Feed'], ['ig_feed', 'Instagram feed'], ['ig_story', 'Instagram Stories'], ['reels', 'Instagram Reels']] as const).map(([id, l]) => (
          <button key={id} className={pl === id ? 'on' : ''} onClick={() => setPl(id)}>{l}</button>
        ))}
      </div>
      {pl === 'fb_feed' && (
        <div className="fb-post">
          <div className="fb-head">
            <Avatar s={s} />
            <div>
              <b>{c.identity || s.brand}</b>
              <div className="muted small">Sponsored · 🌐</div>
            </div>
            <span className="fb-more">···</span>
          </div>
          <div className="fb-text">{short ? <>{short}… <span className="muted">See more</span></> : c.primaryText || <span className="placeholder">Primary text</span>}</div>
          <MediaBox c={c} emoji={s.emoji} aspect={c.aspect === '9:16' ? '4:5' : c.aspect} />
          <div className="fb-cta">
            <div className="fb-cta-text">
              <div className="muted tiny">{domainOf(c.url).toUpperCase()}</div>
              <b>{c.headlines[0] || <span className="placeholder">Headline</span>}</b>
              {c.descriptions[0] && <div className="muted small">{c.descriptions[0]}</div>}
            </div>
            <button className="fb-cta-btn">{c.cta}</button>
          </div>
          <div className="fb-reacts"><span>👍❤️ 128</span><span>14 comments · 6 shares</span></div>
          <div className="fb-actions"><span>👍 Like</span><span>💬 Comment</span><span>↗ Share</span></div>
        </div>
      )}
      {pl === 'ig_feed' && (
        <div className="ig-post">
          <div className="ig-head">
            <Avatar s={s} size={32} />
            <div>
              <b>{(c.identity || s.brand).toLowerCase().replace(/[^a-z0-9]/g, '')}</b>
              <div className="tiny">Sponsored</div>
            </div>
            <span className="fb-more">···</span>
          </div>
          <MediaBox c={c} emoji={s.emoji} aspect={c.aspect === '9:16' ? '4:5' : c.aspect === '1.91:1' ? '1:1' : c.aspect} />
          <div className="ig-cta"><span>{c.cta}</span><span>›</span></div>
          <div className="ig-icons"><span>♡ 💬 ➤</span><span>🔖</span></div>
          <div className="ig-caption"><b>{(c.identity || s.brand).toLowerCase().replace(/[^a-z0-9]/g, '')}</b> {truncate(c.primaryText, 90) ? <>{truncate(c.primaryText, 90)}… <span className="muted">more</span></> : c.primaryText}</div>
        </div>
      )}
      {(pl === 'ig_story' || pl === 'reels') && (
        <div className="ig-story">
          <MediaBox c={c} emoji={s.emoji} fill />
          <div className="story-top">
            {pl === 'ig_story' && <div className="story-bars"><i /></div>}
            <div className="story-id"><Avatar s={s} size={26} /><b>{(c.identity || s.brand).toLowerCase().replace(/[^a-z0-9]/g, '')}</b><span>Sponsored</span></div>
          </div>
          {pl === 'reels' && <div className="reels-rail"><span>♡</span><span>💬</span><span>➤</span><span>···</span></div>}
          <div className="story-bottom">
            {pl === 'reels' && <div className="reels-cap">{truncate(c.primaryText, 60) ?? c.primaryText}</div>}
            <div className="story-cta">{pl === 'ig_story' ? '⌃ ' : ''}{c.cta}</div>
          </div>
        </div>
      )}
      {c.aspect !== '9:16' && (pl === 'ig_story' || pl === 'reels') && <p className="pv-warn">Your media isn’t 9:16 — it will be letterboxed or cropped here.</p>}
    </div>
  );
}

/* --------------------------------- TikTok --------------------------------- */

export function TikTokPreview({ c, s }: { c: Creative; s: Scenario }) {
  return (
    <div className="pv pv-tiktok">
      <div className="phone tt-phone">
        <div className={`tt-media ${c.aspect !== '9:16' ? 'letterbox' : ''}`}>
          <MediaBox c={c} emoji={s.emoji} fill={c.aspect === '9:16'} aspect={c.aspect} />
        </div>
        <div className="tt-top"><span>Following</span><b>For You</b><span>🔍</span></div>
        <div className="tt-rail">
          <span className="tt-av"><Avatar s={s} size={40} /><i>+</i></span>
          <span>❤️<small>24.1K</small></span>
          <span>💬<small>312</small></span>
          <span>🔖<small>1,204</small></span>
          <span>↪<small>Share</small></span>
          <span className="tt-disc">{s.emoji}</span>
        </div>
        <div className="tt-bottom">
          <b>{c.identity || s.brand}</b>
          <div className="tt-text">{c.primaryText ? renderText(c.primaryText) : <span className="placeholder">Ad text</span>}</div>
          <div className="tt-sponsored">Sponsored</div>
          <div className="tt-cta">{c.cta} <span>›</span></div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- Google --------------------------------- */

export function GooglePreview({ c, s, campaign, keywords }: { c: Creative; s: Scenario; campaign?: Campaign; keywords?: Keyword[] }) {
  const type = campaign?.campaignType ?? 'search';
  const [view, setView] = useState<'mobile' | 'desktop'>('mobile');
  const hs = c.headlines.filter(Boolean);
  const ds = c.descriptions.filter(Boolean);
  const path = [domainOf(c.url), ...c.displayPath.filter(Boolean)].join(' › ');
  const q = keywords?.[0]?.text || s.keywords[0].text;
  if (type === 'search' || type === 'pmax') {
    return (
      <div className="pv pv-google">
        <div className="pv-tabs">
          <button className={view === 'mobile' ? 'on' : ''} onClick={() => setView('mobile')}>Mobile</button>
          <button className={view === 'desktop' ? 'on' : ''} onClick={() => setView('desktop')}>Desktop</button>
        </div>
        <div className={`serp ${view}`}>
          <div className="serp-bar"><span className="g-logo"><b style={{ color: '#4285f4' }}>G</b><b style={{ color: '#ea4335' }}>o</b><b style={{ color: '#fbbc05' }}>o</b><b style={{ color: '#4285f4' }}>g</b><b style={{ color: '#34a853' }}>l</b><b style={{ color: '#ea4335' }}>e</b></span><div className="serp-q">{q}<span>🔍</span></div></div>
          <div className="serp-tabs"><b>All</b><span>Images</span><span>Shopping</span><span>News</span></div>
          <div className="serp-ad">
            <div className="serp-sponsored">Sponsored</div>
            <div className="serp-site"><span className="serp-fav">{s.emoji}</span><div><div className="serp-name">{c.identity || s.brand}</div><div className="serp-url">{path}</div></div><span className="muted">⋮</span></div>
            <a className="serp-title">{hs.length ? hs.slice(0, 3).join(' | ') : <span className="placeholder">Headline 1 | Headline 2 | Headline 3</span>}</a>
            <div className="serp-desc">{ds.length ? ds.slice(0, 2).join(' ') : <span className="placeholder">Your description text will appear here.</span>}</div>
            {view === 'desktop' && hs.length > 3 && <div className="serp-links">{hs.slice(3, 6).map((h) => <a key={h}>{h}</a>)}</div>}
          </div>
          <div className="serp-organic"><i /><i /><i className="short" /></div>
          <div className="serp-organic"><i /><i className="short" /></div>
        </div>
        <p className="muted small">Ad preview — headlines and descriptions are combined automatically and may appear in any order.</p>
      </div>
    );
  }
  if (type === 'video' || type === 'demandgen') {
    return (
      <div className="pv pv-google">
        <div className="yt">
          <div className="yt-player">
            <MediaBox c={{ ...c, mediaKind: 'video' }} emoji={s.emoji} aspect="16:9" />
            <div className="yt-ad-badge">Sponsored · 0:05</div>
            <div className="yt-skip">Skip ▸|</div>
          </div>
          <div className="yt-card">
            <span className="serp-fav">{s.emoji}</span>
            <div><b>{hs[0] || 'Headline'}</b><div className="muted small">Sponsored · {domainOf(c.url)}</div></div>
            <button className="yt-cta">{c.cta}</button>
          </div>
          <div className="yt-meta"><i /><i className="short" /></div>
        </div>
      </div>
    );
  }
  return (
    <div className="pv pv-google">
      <div className="gdn-site">
        <div className="gdn-article"><i /><i /><i className="short" /><i /><i className="short" /></div>
        <div className="gdn-ad">
          <MediaBox c={c} emoji={s.emoji} aspect="1.91:1" />
          <div className="gdn-body">
            <b>{hs[0] || 'Headline'}</b>
            <p>{ds[0] || 'Description'}</p>
            <div className="gdn-foot"><span>{c.identity || s.brand}</span><span className="gdn-arrow">›</span></div>
          </div>
          <span className="gdn-choice">▷ ✕</span>
        </div>
        <div className="gdn-article"><i /><i className="short" /></div>
      </div>
    </div>
  );
}

/* ----------------------------------- X ----------------------------------- */

export function XPreview({ c, s }: { c: Creative; s: Scenario }) {
  const handle = c.identity.startsWith('@') ? c.identity : '@' + (c.identity || s.brand).toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    <div className="pv pv-x">
      <article className="x-post">
        <Avatar s={s} size={40} />
        <div className="x-main">
          <div className="x-head"><b>{s.brand}</b><span className="x-badge">✓</span><span className="muted">{handle}</span><span className="x-ad muted">Ad</span></div>
          <div className="x-text">{c.primaryText ? renderText(c.primaryText) : <span className="placeholder">What’s happening?</span>}</div>
          {c.mediaKind !== 'none' && (
            <div className="x-card">
              <div className="x-card-media">
                <MediaBox c={c} emoji={s.emoji} aspect={c.aspect === '9:16' ? '1:1' : c.aspect} />
                {c.headlines[0] && <span className="x-card-title">{c.headlines[0]}</span>}
              </div>
              <div className="x-card-domain muted small">From {domainOf(c.url)}</div>
            </div>
          )}
          <div className="x-actions muted"><span>💬 18</span><span>🔁 42</span><span>♡ 310</span><span>📊 24K</span><span>🔖 ↗</span></div>
        </div>
      </article>
    </div>
  );
}

/* -------------------------------- ChatGPT -------------------------------- */

const CHAT_SAMPLES: Record<string, [string, string]> = {
  brewly: ['What’s the best way to get fresh coffee beans delivered?', 'Freshness matters most: look for roasters that print a roast date and ship within a few days of roasting. Whole beans stay fresh for 2–4 weeks once opened — grind just before brewing. Subscriptions are handy because they time deliveries to how much you drink.'],
  fitpulse: ['Can you suggest a quick workout I can do at home with no equipment?', 'Here’s a 20-minute circuit: 3 rounds of 45s squats, 45s push-ups, 45s lunges, 45s plank and 60s rest. Consistency beats intensity — 3–4 short sessions a week is a great start. Apps can help by adapting the plan as you progress.'],
  nova: ['How should I add vitamin C serum to my skincare routine?', 'Apply vitamin C in the morning after cleansing and before moisturiser and sunscreen. Start with 10–15% concentration, a few times a week, and patch-test first. Store it away from light and heat so it doesn’t oxidise.'],
  ledgerleaf: ['What’s the easiest way to handle invoicing for my small business?', 'Use accounting software that creates invoices from templates, sends automatic reminders and syncs with your bank. That keeps income, expenses and taxes in one place. Look for tools with a free trial so you can test the workflow.'],
};

export function ChatGPTPreview({ c, s }: { c: Creative; s: Scenario }) {
  const [q, a] = CHAT_SAMPLES[s.id] ?? CHAT_SAMPLES.brewly;
  return (
    <div className="pv pv-chatgpt">
      <div className="cg-window">
        <div className="cg-top"><b>ChatGPT</b><span className="muted">⌄</span></div>
        <div className="cg-msgs">
          <div className="cg-user">{q}</div>
          <div className="cg-assistant">
            <p>{a}</p>
            <div className="cg-sponsored">
              <div className="cg-sp-label">Sponsored</div>
              <div className="cg-sp-card">
                {c.mediaKind !== 'none' && <div className="cg-sp-thumb"><MediaBox c={c} emoji={s.emoji} aspect="1:1" /></div>}
                <div className="cg-sp-body">
                  <div className="cg-sp-brand"><span className="serp-fav">{s.emoji}</span>{c.identity || s.brand}</div>
                  <b>{c.headlines[0] || <span className="placeholder">Ad title</span>}</b>
                  <p>{c.descriptions[0] || <span className="placeholder">Ad description</span>}</p>
                  <span className="cg-sp-cta">{c.cta} ↗</span>
                </div>
              </div>
            </div>
            <div className="cg-tools muted">⧉ 👍 👎 ↻</div>
          </div>
        </div>
        <div className="cg-input">Ask anything<span>⬆</span></div>
      </div>
      <p className="muted small">Ads are shown below answers when the conversation matches your topics. Ads don’t influence ChatGPT’s answers.</p>
    </div>
  );
}

export function AdPreview({ platform, c, s, campaign, keywords }: { platform: string; c: Creative; s: Scenario; campaign?: Campaign; keywords?: Keyword[] }) {
  switch (platform) {
    case 'meta': return <MetaPreview c={c} s={s} />;
    case 'tiktok': return <TikTokPreview c={c} s={s} />;
    case 'google': return <GooglePreview c={c} s={s} campaign={campaign} keywords={keywords} />;
    case 'x': return <XPreview c={c} s={s} />;
    default: return <ChatGPTPreview c={c} s={s} />;
  }
}
