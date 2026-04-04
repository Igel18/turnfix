/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./src'),
      // Resolve shared package to TS source (same as vite.config.ts) so Vitest
      // always picks up the latest code without needing a dist rebuild.
      // Note: more specific paths must come before general ones
      '@turnfix/shared/dist/scoreFormatter': path.resolve('../shared/src/scoreFormatter.ts'),
      '@turnfix/shared': path.resolve('../shared/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    dangerouslyIgnoreUnhandledErrors: true,
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**',
      '**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*',
      '**/src/test/_archive_old/**',
      'e2e/**'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        'dist/',
      ],
    },
  },
});
