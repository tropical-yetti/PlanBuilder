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

test('eletrodomésticos e porta sanfonada', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)
  const place = async (name: string, x: number, y: number) => {
    await page.locator('.lib-card', { hasText: name }).first().click()
    await w.click(x, y)
    await page.keyboard.press('Escape')
  }

  // Geladeira perto da parede de cima: o fundo encosta e as medidas são as do modelo Brastemp
  await place('Geladeira duplex', -120, -100)
  await expect(page.locator('.props-title')).toHaveText('Geladeira duplex')
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('62,1')
  await page.locator('.field:has-text("Tipo") select').selectOption('appliance.fridge-side')
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('83,6')

  await place('Fogão 5 bocas', 40, -100)
  await place('Máquina de lavar', 120, 100)

  const items = Object.values(((await savedProject(page)) as unknown as { items: Record<string, SavedItem> }).items)
  expect(items.map((it) => it.componentId)).toEqual(['appliance.fridge-side', 'appliance.stove-5', 'appliance.washer-top'])
  // fundo da geladeira encostado na face interna da parede de cima (y = −150 + 7,5)
  const fridge = items[0]!
  expect(fridge.rotation).toBe(0)
  expect(fridge.y - fridge.depth / 2).toBeCloseTo(-142.5)

  // Porta sanfonada na parede de baixo
  await place('Porta sanfonada', -50, 145)
  await expect(page.locator('.props-title')).toHaveText('Porta sanfonada')
  await page.getByRole('button', { name: '120', exact: true }).click()
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('120')

  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.locator('.area-row', { hasText: 'Porta sanfonada' })).toContainText('1')
  await expect(page.locator('.area-row', { hasText: 'Fogão 5 bocas' })).toContainText('1')
})

test('gabinetes de cozinha e lavanderia e lava-louças', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)
  const place = async (name: string, x: number, y: number) => {
    await page.locator('.lib-card', { hasText: name }).first().click()
    await w.click(x, y)
    await page.keyboard.press('Escape')
  }

  // Gabinete de pia encostado na parede de cima, com cuba dupla
  await place('Gabinete de pia', -100, -110)
  await expect(page.locator('.props-title')).toHaveText('Gabinete de pia')
  await page.getByRole('button', { name: '150 cm', exact: true }).click()
  await page.getByRole('combobox', { name: 'Cuba', exact: true }).selectOption('2')

  // Armário aéreo acima, a 150 cm do piso; a altura do piso é editável
  await place('Armário aéreo', -100, -130)
  await expect(page.locator('.field:has-text("Altura do piso") input')).toHaveValue('150')
  await page.locator('.field:has-text("Altura do piso") input').fill('160')
  await page.keyboard.press('Enter')

  // Lava-louças de 14 serviços ao lado da pia
  await place('Lava-louças 14 serviços', 30, -110)
  await expect(page.locator('.field:has-text("Largura") input')).toHaveValue('59,8')

  // Lavanderia: tanque na parede de baixo
  await place('Gabinete com tanque', 120, 100)

  const project = (await savedProject(page)) as unknown as { items: Record<string, SavedItem & { params: Record<string, unknown> }> }
  const items = Object.values(project.items)
  expect(items.map((it) => it.componentId)).toEqual(['kitchen.sink-cabinet', 'kitchen.wall-cabinet', 'appliance.dishwasher-14', 'laundry.tank-cabinet'])
  expect(items[0]).toMatchObject({ width: 150, depth: 60, rotation: 0, params: { basins: 2 } })
  expect(items[0]!.y - 30).toBeCloseTo(-142.5) // fundo encostado na parede
  expect(items[1]).toMatchObject({ depth: 35, params: { elevation: 160 } })
  expect(items[3]).toMatchObject({ rotation: 180 }) // encostado na parede de baixo

  await page.getByRole('radio', { name: 'Dividido' }).click()
  await expect(page.locator('[data-testid=scene3d]')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
})

test('banheiro: bacia encosta na parede, gabinete com duas cubas e box de canto', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)

  await page.locator('.lib-card', { hasText: 'Bacia com caixa acoplada' }).click()
  await w.click(-170, 0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.props-title')).toHaveText('Bacia com caixa acoplada')

  await page.locator('.lib-card', { hasText: 'Gabinete com cuba' }).click()
  await w.click(0, 120)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: '120 cm', exact: true }).click()
  await page.getByRole('combobox', { name: 'Cuba', exact: true }).selectOption('2')

  await page.locator('.lib-card', { hasText: 'Box de chuveiro' }).click()
  await w.click(130, -100)
  await page.keyboard.press('Escape')
  await page.getByRole('combobox', { name: 'Vidro', exact: true }).selectOption('corner')

  const items = Object.values(((await savedProject(page)) as unknown as { items: Record<string, SavedItem & { params: Record<string, unknown> }> }).items)
  // fundo da bacia na face da parede da esquerda (x = −200 + 7,5), virada para dentro
  expect(items.find((it) => it.componentId === 'bathroom.toilet-tank')).toMatchObject({ x: -200 + 7.5 + 32.5, rotation: 270 })
  expect(items.find((it) => it.componentId === 'bathroom.vanity')).toMatchObject({ width: 120, params: { basins: 2 } })
  expect(items.find((it) => it.componentId === 'bathroom.shower')).toMatchObject({ params: { layout: 'corner' } })
})
