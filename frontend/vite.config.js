import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Porta só do AdoPet: é a origem autorizada no Google Cloud ("Entrar com o Google").
    // strictPort: se estiver ocupada, o Vite avisa em vez de pular para outra porta,
    // o que faria o Google recusar o login (origin_mismatch).
    port: 5180,
    strictPort: true,
    // As chamadas para /api vão para o backend.
    proxy: {
      '/api': {
        target: 'http://localhost:3333',
        changeOrigin: true
      }
    }
  }
})
