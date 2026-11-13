import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// O app será publicado em https://<usuário>.github.io/PlanBuilder/ (fase de release),
// então o build usa esse caminho base. Em desenvolvimento, o app roda na raiz.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/PlanBuilder/' : '/',
  plugins: [react()],
}))
