import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    port: 5173,
    proxy: {
      '/login': 'http://127.0.0.1:5000',
      '/register': 'http://127.0.0.1:5000',
      '/predict': 'http://127.0.0.1:5000',
      '/predict_page': 'http://127.0.0.1:5000',
      '/dashboard': 'http://127.0.0.1:5000',
      '/history': 'http://127.0.0.1:5000',
      '/profile': 'http://127.0.0.1:5000',
      '/update_profile': 'http://127.0.0.1:5000',
      '/upload_profile_pic': 'http://127.0.0.1:5000',
      '/logout': 'http://127.0.0.1:5000',
      '/api': 'http://127.0.0.1:5000'
    }
  },
  build: {
    outDir: '../static/react',
    emptyOutDir: true,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/index.js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name && assetInfo.name.endsWith('.css')) {
            return 'assets/index.css'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})
