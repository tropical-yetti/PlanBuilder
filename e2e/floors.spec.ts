import { expect, test } from '@playwright/test'
import { drawRoom, openApp, savedProject, world } from './helpers'

interface SavedFloor {
  componentId: string
  pattern: string
  width: number
  length: number
  color: string
}

const floors = async (page: Parameters<typeof savedProject>[0]) =>
  Object.values(((await savedProject(page)) as unknown as { floors: Record<string, SavedFloor> }).floors)

test('pisos: aplicar da biblioteca, ajustar no painel do cômodo, desfazer e ver o quantitativo', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)

  // Clique fora do cômodo não aplica; dentro, aplica e seleciona o cômodo
  await page.locator('.lib-card', { hasText: 'Porcelanato 60 × 60' }).click()
  await w.click(320, 0)
  await expect(page.getByText('Clique dentro de um cômodo fechado')).toBeVisible()
  await w.click(0, 0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.props-title')).toHaveText('Cômodo')
  await expect(page.getByLabel('Piso do cômodo')).toHaveValue('floor.porcelain-60')
  expect(await floors(page)).toMatchObject([{ componentId: 'floor.porcelain-60', pattern: 'grid', width: 60, length: 60 }])

  // Ajustes: paginação, tamanho e cor
  await page.getByRole('button', { name: 'Diagonal', exact: true }).click()
  await page.getByRole('button', { name: '60 × 120', exact: true }).click()
  await page.getByRole('button', { name: 'Grafite', exact: true }).click()
  expect(await floors(page)).toMatchObject([{ pattern: 'diagonal', width: 60, length: 120, color: '#6b6f75' }])
  await expect(page.locator('.area-row', { hasText: 'Comprar' })).toContainText('15%')

  // Desfazer volta a cor
  await page.keyboard.press('Control+z')
  expect((await floors(page))[0]!.color).toBe('#e3d6c3')

  // Clique fora tira a seleção; clique dentro seleciona o cômodo de novo
  await w.click(320, 0)
  await expect(page.locator('.props-title')).not.toHaveText('Cômodo')
  await w.click(50, 50)
  await expect(page.locator('.props-title')).toHaveText('Cômodo')

  // Quadro de áreas mostra o piso
  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.locator('.areas')).toContainText('Pisos')
  await expect(page.locator('.areas')).toContainText('Porcelanato 60 × 60 (60 × 120)')

  // Trocar e remover pelo painel
  await page.getByRole('tab', { name: 'Propriedades' }).click()
  await page.getByLabel('Piso do cômodo').selectOption('floor.taco-herringbone')
  expect(await floors(page)).toMatchObject([{ componentId: 'floor.taco-herringbone', pattern: 'herringbone', width: 7, length: 35 }])
  await page.getByRole('button', { name: 'Remover piso' }).click()
  expect(await floors(page)).toEqual([])
})
