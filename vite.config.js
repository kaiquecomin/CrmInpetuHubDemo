import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  publicDir: command === 'serve' ? 'src/main/resources/static' : false,
  build: {
    outDir: 'src/main/resources/static',
    emptyOutDir: false,
  },
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5173 },
  preview: { host: '127.0.0.1' },
}))
