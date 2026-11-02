import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// `base: './'` keeps the build portable (GitHub Pages, Netlify, any static host).
export default defineConfig({
  base: './',
  plugins: [react()],
});
