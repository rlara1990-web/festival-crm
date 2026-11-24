import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// La app vive en web/; el código compartido (puntuación) en src/.
export default defineConfig({
  root: 'web',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, host: '127.0.0.1' },
});
