import type { Creative } from '../types';
import { presetById } from '../data/media';

const RATIO: Record<string, string> = { '1:1': '1 / 1', '4:5': '4 / 5', '9:16': '9 / 16', '16:9': '16 / 9', '1.91:1': '1.91 / 1' };

export function MediaBox({ c, emoji, aspect, fill, className = '' }: { c: Creative; emoji: string; aspect?: string; fill?: boolean; className?: string }) {
  const preset = presetById(c.mediaPreset);
  const style: React.CSSProperties = fill ? { height: '100%', width: '100%' } : { aspectRatio: RATIO[aspect ?? c.aspect] ?? '1 / 1' };
  if (c.mediaKind === 'none') return null;
  return (
    <div className={`media media-${preset.style} ${className}`} style={{ ...style, background: c.mediaUpload ? '#000' : preset.bg }}>
      {c.mediaUpload ? (
        <img src={c.mediaUpload} alt="" />
      ) : (
        <div className="media-art">
          <span className="media-emoji">{preset.style === 'product' ? emoji : preset.emoji}</span>
          {preset.style !== 'product' && <span className="media-emoji small">{emoji}</span>}
        </div>
      )}
      {c.overlay && <div className={`media-overlay ${preset.style === 'text' ? 'big' : ''}`}>{c.overlay}</div>}
      {c.mediaKind === 'video' && <div className="media-play">▶</div>}
      {c.mediaKind === 'video' && <div className="media-dur">0:15</div>}
      {c.mediaKind === 'carousel' && <div className="media-dots"><i className="on" /><i /><i /></div>}
    </div>
  );
}

/** Downscale an uploaded image so it fits comfortably in localStorage. */
export function readImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
