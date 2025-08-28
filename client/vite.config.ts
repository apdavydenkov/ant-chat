import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: parseInt(process.env.VITE_CLIENT_PORT),
    hmr: {
      host: 'app.local.wddt.ru',
      protocol: 'wss',
      path: '/tunnel-ws'
    }
  }
})
