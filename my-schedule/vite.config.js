import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'] // Кэшируем все файлы для оффлайна
      },
      manifest: {
        name: 'Расписание',
        short_name: 'Расписание',
        description: 'Расписание занятий',
        theme_color: '#0f0f0f',
        background_color: '#0f0f0f',
        display: 'standalone', // Именно эта строчка убирает адресную строку браузера (Safari)
        icons: [
          {
            src: 'icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/my-schedule/', // Твой репозиторий
})