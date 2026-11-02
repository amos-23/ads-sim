import { useEffect, useState, type ReactNode } from 'react';
import type { PlatformId } from '../types';

export function Toggle({ on, onChange, label, disabled }: { on: boolean; onChange: (v: boolean) => void; label?: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} disabled={disabled} className={`toggle ${on ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); onChange(!on); }}>
      <span className="knob" />
    </button>
  );
}

export function Info({ text }: { text: string }) {
  return (
    <span className="info" tabIndex={0} aria-label={text}>
      i<span className="tip">{text}</span>
    </span>
  );
}

export function Field({ label, help, children, error, right }: { label?: ReactNode; help?: string; children: ReactNode; error?: string; right?: ReactNode }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {(label || right) && (
        <div className="field-label">
          <span>{label}{help && <Info text={help} />}</span>
          {right}
        </div>
      )}
      {children}
      {error && <div className="field-error">{error}</div>}
    </div>
  );
}

export function Card({ title, children, subtitle, right, id }: { title?: ReactNode; subtitle?: ReactNode; children: ReactNode; right?: ReactNode; id?: string }) {
  return (
    <section className="card" id={id}>
      {title && (
        <header className="card-head">
          <div>
            <h3>{title}</h3>
            {subtitle && <p className="muted">{subtitle}</p>}
          </div>
          {right}
        </header>
      )}
      <div className="card-body">{children}</div>
    </section>
  );
}

export function Dot({ tone }: { tone: string }) {
  return <span className={`dot dot-${tone}`} />;
}

export function Modal({ children, onClose, wide, className = '' }: { children: ReactNode; onClose: () => void; wide?: boolean; className?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className={`modal ${wide ? 'wide' : ''} ${className}`} onMouseDown={(e) => e.stopPropagation()} role="dialog">
        {children}
      </div>
    </div>
  );
}

export function Counter({ value, limit, rec }: { value: string; limit: number; rec?: number }) {
  const n = value.length;
  return <span className={`counter ${n > limit ? 'over' : rec && n > rec ? 'warn' : ''}`}>{n}/{rec && n <= rec ? rec : limit}</span>;
}

export function ChipInput({ values, options, onChange, placeholder }: { values: string[]; options: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = options.filter((o) => !values.includes(o) && o.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="chip-input" onBlur={() => setTimeout(() => setOpen(false), 150)}>
      <div className="chips">
        {values.map((v) => (
          <span className="chip" key={v}>
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(values.filter((x) => x !== v))}>×</button>
          </span>
        ))}
        <input value={q} placeholder={values.length ? '' : placeholder} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} />
      </div>
      {open && filtered.length > 0 && (
        <ul className="dropdown">
          {filtered.slice(0, 12).map((o) => (
            <li key={o} onMouseDown={(e) => { e.preventDefault(); onChange([...values, o]); setQ(''); }}>{o}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Stylised, non-trademark glyph for each platform. */
export function PlatformMark({ id, size = 28 }: { id: PlatformId; size?: number }) {
  const s = { width: size, height: size, fontSize: size * 0.62 } as const;
  return <span className={`pmark pmark-${id}`} style={s} aria-hidden>{({ meta: '∞', tiktok: '♪', google: 'G', x: '𝕏', chatgpt: '✺' } as const)[id]}</span>;
}

export function Money({ value, onChange, min, prefix = '$', suffix, step = 1, ariaLabel }: { value: number | null; onChange: (n: number | null) => void; min?: number; prefix?: string; suffix?: string; step?: number; ariaLabel?: string }) {
  return (
    <div className="money">
      {prefix && <span className="affix">{prefix}</span>}
      <input type="number" aria-label={ariaLabel} inputMode="decimal" min={min} step={step} value={value ?? ''} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />
      {suffix && <span className="affix">{suffix}</span>}
    </div>
  );
}
