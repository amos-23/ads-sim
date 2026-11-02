export interface MediaPreset {
  id: string;
  label: string;
  style: 'product' | 'lifestyle' | 'ugc' | 'text' | 'stock';
  bg: string;
  emoji: string;
  /** Short description shown in the media library. */
  note: string;
}

/** A small "media library" of mock creatives. The scenario emoji is used for product shots. */
export const MEDIA_PRESETS: MediaPreset[] = [
  { id: 'product-warm', label: 'Product shot · warm', style: 'product', bg: 'linear-gradient(135deg,#f6d365 0%,#fda085 100%)', emoji: '', note: 'Clean studio product photo' },
  { id: 'product-dark', label: 'Product shot · dark', style: 'product', bg: 'linear-gradient(135deg,#232526 0%,#414345 100%)', emoji: '', note: 'Moody premium product photo' },
  { id: 'lifestyle', label: 'Lifestyle', style: 'lifestyle', bg: 'linear-gradient(135deg,#a1c4fd 0%,#c2e9fb 100%)', emoji: '🙂', note: 'Product in use, real setting' },
  { id: 'ugc', label: 'UGC selfie video', style: 'ugc', bg: 'linear-gradient(160deg,#ff9a9e 0%,#fecfef 60%,#f6f6f6 100%)', emoji: '🤳', note: 'Creator talking to camera — native feel' },
  { id: 'text', label: 'Text-heavy graphic', style: 'text', bg: 'linear-gradient(135deg,#7f00ff 0%,#e100ff 100%)', emoji: '📣', note: 'Big offer text, little imagery' },
  { id: 'stock', label: 'Generic stock photo', style: 'stock', bg: 'linear-gradient(135deg,#bdc3c7 0%,#2c3e50 100%)', emoji: '🏙️', note: 'Recognisable stock imagery' },
  { id: 'fresh', label: 'Bright flat-lay', style: 'lifestyle', bg: 'linear-gradient(135deg,#d4fc79 0%,#96e6a1 100%)', emoji: '🌿', note: 'Colourful flat-lay composition' },
  { id: 'night', label: 'Night neon', style: 'product', bg: 'linear-gradient(135deg,#0f2027 0%,#203a43 50%,#2c5364 100%)', emoji: '🌙', note: 'High-contrast neon look' },
];

export const presetById = (id: string) => MEDIA_PRESETS.find((m) => m.id === id) ?? MEDIA_PRESETS[0];
