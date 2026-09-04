import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/my-schedule/', // ВАЖНО: тут должно быть имя твоего репозитория в слэшах!
})