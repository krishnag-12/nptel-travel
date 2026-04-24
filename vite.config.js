import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/nptel-travel/' // THIS MUST MATCH YOUR REPO NAME
})
