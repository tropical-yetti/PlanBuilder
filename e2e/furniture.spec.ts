import { expect, test } from '@playwright/test'
import { drawRoom, openApp, savedProject, world } from './helpers'

interface SavedItem {
  componentId: string
  x: number
  y: number
  rotation: number
  width: number
  depth: number
}

test('móveis: inserir encostado na parede, trocar o tamanho da cama, girar e ver em 3D', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -250, -200, '500x400')
  const w = await world(page)

  // Sofá perto da parede de cima: encosta o fundo nela
  await page.locator('.lib-card', { hasText: 'Sofá de 3 lugares' }).click()
  await w.click(0, -140)
  await page.keyboard.press('Escape')
  await expect(page.locator('.props-title')).toHaveText('Sofá de 3 lugares')
  let items = Object.values(((await savedProject(page)) as unknown as { items: Record<string, SavedItem> }).items)
  expect(items[0]).toMatchObject({ componentId: 'furniture.sofa-3', x: 0, y: -200 + 7.5 + 45, rotation: 0 })

  // Cama de casal perto da parede da direita, trocada para king
  await page.locator('.lib-card', { hasText: 'Cama de casal' }).click()
  await w.click(160, 50)
  await page.keyboard.press('Escape')
  await page.locator('.field:has-text("Tipo") select').selectOption('furniture.bed-king')
  await expect(page.locator('.props-title')).toHaveText('Cama king')
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('193')

  // Mesa redonda solta no meio, com o tamanho de 7 lugares; depois girada com R
  await page.locator('.lib-card', { hasText: 'Mesa redonda' }).click()
  await w.click(-80, 60)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: /150 · 7 lugares/ }).click()
  await expect(page.locator('.field:has-text("Diâmetro") input')).toHaveValue('150')
  await page.keyboard.press('r')
  await expect(page.locator('.field:has-text("Rotação") input')).toHaveValue('90')

  items = Object.values(((await savedProject(page)) as unknown as { items: Record<string, SavedItem> }).items)
  expect(items.map((it) => it.componentId)).toEqual(['furniture.sofa-3', 'furniture.bed-king', 'furniture.table-round'])
  const bed = items[1]!
  expect(bed).toMatchObject({ width: 193, depth: 203, rotation: 90 })
  expect(bed.x).toBeCloseTo(250 - 7.5 - 203 / 2)

  // Contagem na aba Áreas
  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.locator('.area-row', { hasText: 'Cama king' })).toContainText('1')

  // Vista 3D abre sem erro com os móveis
  await page.getByRole('radio', { name: 'Dividido' }).click()
  await expect(page.locator('[data-testid=scene3d]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
})

test('cobogó: painel na parede, ocupar a parede inteira e estimativa de peças', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)
  await page.locator('.lib-card', { hasText: 'Parede de cobogó' }).click()
  await w.click(0, -150)
  await page.keyboard.press('Escape')
  await expect(page.locator('.props-title')).toHaveText('Parede de cobogó')
  // ocupa do piso ao topo da parede (280 cm)
  await expect(page.locator('.field:has-text("Altura") input')).toHaveValue('280')

  await page.getByRole('button', { name: 'Ocupar a parede inteira' }).click()
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('390')
  // 390 × 280 com peças de 25: 16 colunas × 12 fileiras
  await expect(page.locator('.field:has-text("Peças")')).toContainText('192')

  await page.locator('.field:has-text("Peça") select').selectOption('40')
  // 390/40 → 10 colunas; 280/40 → 7 fileiras
  await expect(page.locator('.field:has-text("Peças")')).toContainText('70')

  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.locator('.area-row', { hasText: /^Cobogó/ })).toContainText('10,92 m²')
})
