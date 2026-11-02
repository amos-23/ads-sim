import { useState } from 'react';

export interface Series {
  label: string;
  values: number[];
  color: string;
  fmt?: (n: number) => string;
}

export function LineChart({ labels, series, format, height = 180 }: { labels: string[]; series: Series[]; format: (n: number) => string; height?: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = height;
  const pad = { l: 8, r: 8, t: 12, b: 22 };
  const n = Math.max(1, labels.length);
  const x = (i: number) => pad.l + (n === 1 ? (W - pad.l - pad.r) / 2 : (i / (n - 1)) * (W - pad.l - pad.r));
  if (!labels.length) return <div className="chart-empty">No data yet — advance the simulation to see results.</div>;
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" onMouseLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((g) => <line key={g} x1={pad.l} x2={W - pad.r} y1={pad.t + g * (H - pad.t - pad.b)} y2={pad.t + g * (H - pad.t - pad.b)} className="grid" />)}
        {series.map((s) => {
          const max = Math.max(1e-9, ...s.values) * 1.1;
          const y = (v: number) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
          const d = s.values.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join(' ');
          return (
            <g key={s.label}>
              <path d={d} fill="none" stroke={s.color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
              {s.values.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={hover === i ? 5 : n < 20 ? 3 : 0} fill={s.color} vectorEffect="non-scaling-stroke" />)}
            </g>
          );
        })}
        {labels.map((_, i) => <rect key={i} x={x(i) - (W / n) / 2} y={0} width={W / n} height={H} fill="transparent" onMouseEnter={() => setHover(i)} />)}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} className="hover-line" />}
      </svg>
      <div className="chart-x">
        {labels.map((l, i) => (n <= 10 || i % Math.ceil(n / 8) === 0 ? <span key={i} style={{ left: `${(x(i) / W) * 100}%` }}>{l}</span> : null))}
      </div>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%` }}>
          <b>{labels[hover]}</b>
          {series.map((s) => <div key={s.label}><i style={{ background: s.color }} />{s.label}: {(s.fmt ?? format)(s.values[hover] ?? 0)}</div>)}
        </div>
      )}
    </div>
  );
}
