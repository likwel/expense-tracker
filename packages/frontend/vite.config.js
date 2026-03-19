import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target:       'http://localhost:3000',
        changeOrigin: true,
        secure:       false,
        // Optionnel : afficher les requêtes proxifiées dans le terminal
        configure: (proxy) => {
          proxy.on('error', (err) => console.log('[proxy error]', err))
          proxy.on('proxyReq', (_, req) => console.log('[proxy]', req.method, req.url))
        },
      },
    },
  },
})