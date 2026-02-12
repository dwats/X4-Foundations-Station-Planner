import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/Station-Planner-For-X4-Foundations/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
