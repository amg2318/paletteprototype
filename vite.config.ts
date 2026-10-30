import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command }) => ({
  plugins: [react()],
  // GitHub Pages serves the project from /paletteprototype/.
  base: command === 'build' ? '/paletteprototype/' : '/',
}));
