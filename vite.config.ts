import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O app será publicado em https://<usuário>.github.io/PlanBuilder/ (fase de release), então o build
// e a pré-visualização do build (`npm run preview`) usam esse caminho base.
// Em desenvolvimento (`npm run dev`), o app roda na raiz.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/PlanBuilder/' : '/',
  plugins: [react()],
  build: {
    // A vista 3D (three.js) fica num arquivo à parte, carregado só quando aberta; ele passa do limite padrão de aviso.
    chunkSizeWarningLimit: 1000,
  },
}))
