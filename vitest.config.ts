import { defineConfig } from 'vitest/config';

// Pruebas en la raíz (tests/), independientes de la config de la web.
export default defineConfig({ test: { root: '.', include: ['tests/**/*.test.ts'] } });
