/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import * as path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    // Use the shared TS source so its React components run on the portal's React instance
    alias: {
      '@turnfix/shared/dist/scoreFormatter': path.resolve(__dirname, '../shared/src/scoreFormatter.ts'),
      '@turnfix/shared': path.resolve(__dirname, '../shared/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: false,
  },
});
