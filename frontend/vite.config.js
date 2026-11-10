import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
      '/login': 'http://backend:8000',
      '/logout': 'http://backend:8000',
      '/forgot-password': 'http://backend:8000',
      '/reset-password': 'http://backend:8000',
      '/two-factor-challenge': 'http://backend:8000',
      '/user': 'http://backend:8000',

      '/sanctum': {
        target: 'http://backend:8000',
        changeOrigin: true,
      },
    },
  },
})