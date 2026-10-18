import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ command }) => ({
  publicDir: command === 'serve' ? 'src/main/resources/static' : false,
  build: {
    outDir: 'src/main/resources/static',
    emptyOutDir: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/\/(react|react-dom|scheduler)\//.test(id)) return 'vendor-react'
          if (/\/(motion|motion-dom|motion-utils)\//.test(id)) return 'vendor-motion'
          if (id.includes('/@headlessui/')) return 'vendor-headlessui'
          if (id.includes('/lucide-react/')) return 'vendor-icons'
          return undefined
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  server: { host: 'localhost', port: 5173 },
  preview: { host: 'localhost' },
}))
