import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    port: 5264,
    proxy: {
      '/api': {
        target: 'http://localhost:5815',
        changeOrigin: true,
      },
      '/auth': {
        target: 'http://localhost:5815',
        changeOrigin: true,
      },
    },
  },
})
