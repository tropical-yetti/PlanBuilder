import { expect, type Page } from '@playwright/test'

/** Abre o app com o armazenamento do navegador limpo (cada teste começa do zero). */
export async function openApp(page: Page, opts: { welcome?: boolean } = {}) {
  await page.goto('./')
  await page.locator('[data-testid=canvas2d] canvas').first().waitFor()
  if (!opts.welcome) await page.getByRole('button', { name: 'Começar a desenhar' }).click()
}

/**
 * Converte centímetros do mundo em pixels da página. Vale para um projeto novo, antes de mexer no zoom:
 * a origem fica no centro do canvas e 1 cm = 1 pixel.
 */
export async function world(page: Page) {
  const box = await page.locator('[data-testid=canvas2d]').boundingBox()
  if (!box) throw new Error('canvas não encontrado')
  const at = (x: number, y: number): [number, number] => [box.x + box.width / 2 + x, box.y + box.height / 2 + y]
  return {
    at,
    click: (x: number, y: number, options?: Parameters<Page['mouse']['click']>[2]) => page.mouse.click(...at(x, y), options),
    move: (x: number, y: number) => page.mouse.move(...at(x, y)),
  }
}

/** Cria um cômodo retangular com o canto em (x, y) e a medida digitada (ex.: "400x300"). */
export async function drawRoom(page: Page, x: number, y: number, size: string) {
  const w = await world(page)
  await page.keyboard.press('a')
  await w.click(x, y)
  await w.move(x + 50, y + 50)
  await page.keyboard.type(size)
  await page.keyboard.press('Enter')
}

export async function placeFromLibrary(page: Page, name: string, x: number, y: number) {
  const w = await world(page)
  await page.locator('.lib-card', { hasText: name }).click()
  await w.click(x, y)
  await page.keyboard.press('Escape')
}

/** O projeto guardado pelo salvamento automático (espera a gravação, que tem um pequeno atraso). */
export async function savedProject(page: Page) {
  await page.waitForTimeout(700)
  return page.evaluate(() => {
    const raw = localStorage.getItem('planbuilder:autosave')
    return raw ? (JSON.parse(raw).project as { name: string; walls: object; openings: object; texts: object; dimensions: object }) : null
  })
}

export const count = (o: object | undefined) => Object.keys(o ?? {}).length

export async function expectAreas(page: Page, total: string, useful: string) {
  await expect(page.locator('.status-areas')).toHaveText(`Total ${total} · Útil ${useful}`)
}
