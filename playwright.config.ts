import { defineConfig, devices } from '@playwright/test'

/**
 * Testes de ponta a ponta: rodam contra o build de produção (o mesmo que será publicado),
 * servido em /PlanBuilder/ como no GitHub Pages.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://localhost:4173/PlanBuilder/',
    locale: 'pt-BR',
    viewport: { width: 1400, height: 820 },
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1400, height: 820 },
        // WebGL por software, para a vista 3D funcionar em máquinas sem placa de vídeo (CI).
        launchOptions: { args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] },
      },
    },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/PlanBuilder/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
