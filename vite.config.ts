import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// Versão do app (do package.json), exibida na interface para quem testa poder informá-la.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string }

// O app será publicado em https://<usuário>.github.io/PlanBuilder/ (fase de release), então o build
// e a pré-visualização do build (`npm run preview`) usam esse caminho base.
// Em desenvolvimento (`npm run dev`), o app roda na raiz.
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/PlanBuilder/' : '/',
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  build: {
    // A vista 3D (three.js) fica num arquivo à parte, carregado só quando aberta; ele passa do limite padrão de aviso.
    chunkSizeWarningLimit: 1000,
  },
}))
