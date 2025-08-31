import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    hmr: {
      host: 'app.local.wddt.ru',
      protocol: 'wss',
      path: '/tunnel-ws',
      // Отключаем авто-перезагрузку при ошибках HMR
      overlay: false,
      // Уменьшаем частоту проверок
      timeout: 60000
    }
  },
  // Отключаем HMR в production-подобном режиме
  build: {
    rollupOptions: {
      onwarn: () => {} // скрываем warning'ы
    }
  }
})
