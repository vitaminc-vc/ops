import { defineConfig } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { config } from 'dotenv'

config({ path: '.env.local', quiet: true })

export default defineConfig({
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
  plugins: [tailwindcss(), tanstackStart(), react()],
})
