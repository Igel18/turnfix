import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import * as path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve('./src'),
      // Resolve shared package to TS source so Vite always picks up latest code
      // without relying on a potentially stale CJS dist or optimizeDeps cache.
      "@turnfix/shared/dist/scoreFormatter": path.resolve('../shared/src/scoreFormatter.ts'),
      "@turnfix/shared": path.resolve('../shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow network access
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      },
      '/uploads': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
      }
    }
  }
})
