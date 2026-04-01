// apps/web/vite.config.ts
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  // Carga el archivo .env basado en el modo actual (dev, prod, etc.)
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [react(), tailwindcss()],
    server: {
      // Usa el puerto del .env o el 5173 por defecto
      port: parseInt(env.VITE_PORT) || 5173,
    },
  }
})
