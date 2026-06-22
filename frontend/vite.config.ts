import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import type { ProxyOptions } from 'vite'

/** Fallback quando `VITE_API_BASE_URL` está vazio: proxy `/api` para o Nest em dev */
const api = 'http://127.0.0.1:3000'
const apiProxy = (): ProxyOptions => ({
  target: api,
  changeOrigin: true,
  bypass(req) {
    if (req.headers.accept?.includes('text/html')) return '/index.html'
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiProxy(),
    },
  },
})
