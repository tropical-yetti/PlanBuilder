import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { count, drawRoom, expectAreas, openApp, placeFromLibrary, savedProject, world } from './helpers'

test.describe('primeira abertura', () => {
  test('boas-vindas oferecem um exemplo, que abre completo e não reaparece', async ({ page }) => {
    await openApp(page, { welcome: true })
    await expect(page.getByRole('dialog', { name: 'Boas-vindas' })).toBeVisible()
    await page.getByRole('button', { name: 'Abrir um exemplo' }).click()

    await expect(page.locator('.project-name')).toHaveValue('Casa de exemplo')
    await page.getByRole('tab', { name: 'Áreas' }).click()
    await expect(page.getByText('Cômodos (4)')).toBeVisible()
    for (const room of ['Sala', 'Quarto', 'Cozinha', 'Banheiro']) await expect(page.getByLabel(`Nome de ${room}`)).toHaveValue(room)

    const p = await savedProject(page)
    expect(count(p?.openings)).toBe(9) // 4 portas, 4 janelas e 1 cobogó

    await page.reload()
    await expect(page.locator('.project-name')).toHaveValue('Casa de exemplo')
    await expect(page.getByRole('dialog', { name: 'Boas-vindas' })).toBeHidden()
  })
})

test.describe('fluxo principal', () => {
  test('desenhar, inserir porta e janela, áreas, desfazer e continuar depois de recarregar', async ({ page }) => {
    await openApp(page)
    await drawRoom(page, -200, -150, '400x300')
    // 4,00 × 3,00 m pelo eixo, paredes de 15 cm: 4,15 × 3,15 por fora e 3,85 × 2,85 por dentro
    await expectAreas(page, '13,07 m²', '10,97 m²')

    await placeFromLibrary(page, 'Porta de giro simples', 0, 140)
    await placeFromLibrary(page, 'Janela de correr', 0, -140)
    await page.getByRole('tab', { name: 'Áreas' }).click()
    await expect(page.locator('.area-row', { hasText: 'Portas' }).first()).toContainText('1')
    await expect(page.locator('.area-row', { hasText: 'Janelas' }).first()).toContainText('1')
    // vãos descontados: 0,80 × 2,10 + 1,20 × 1,20 = 3,12 m²
    await expect(page.locator('.area-row', { hasText: 'Vãos descontados' })).toContainText('3,12 m²')

    // desfazer a janela e refazer
    await page.keyboard.press('Control+z')
    await expect(page.locator('.area-row', { hasText: 'Vãos descontados' })).toContainText('1,68 m²')
    await page.keyboard.press('Control+Shift+z')
    await expect(page.locator('.area-row', { hasText: 'Vãos descontados' })).toContainText('3,12 m²')

    // dividir o cômodo com uma parede e dar nome
    const w = await world(page)
    await page.keyboard.press('w')
    await w.click(50, -150)
    await w.click(50, 150)
    await page.keyboard.press('Escape')
    await expect(page.getByText('Cômodos (2)')).toBeVisible()
    await page.keyboard.press('v')
    await page.mouse.dblclick(...w.at(-100, 60))
    await page.keyboard.type('Sala')
    await page.keyboard.press('Enter')
    await expect(page.getByLabel('Nome de Sala')).toHaveValue('Sala')

    // recarregar: tudo continua
    const before = await savedProject(page)
    expect(count(before?.walls)).toBe(7)
    await page.reload()
    await expect(page.locator('.status-areas')).toContainText('Total 13,07 m²')
    await page.getByRole('tab', { name: 'Áreas' }).click()
    await expect(page.getByLabel('Nome de Sala')).toHaveValue('Sala')
  })

  test('salvar em arquivo, criar novo, reabrir e exportar PNG', async ({ page }, testInfo) => {
    await openApp(page)
    // Sem o seletor nativo de arquivos (não existe em modo automatizado): usa o caminho de download.
    await page.evaluate(() => {
      const win = window as unknown as Record<string, unknown>
      delete win.showSaveFilePicker
      delete win.showOpenFilePicker
    })
    await drawRoom(page, -200, -150, '400x300')
    await placeFromLibrary(page, 'Porta de giro simples', 0, 140)
    await page.keyboard.press('v')
    await page.locator('.project-name').fill('Casa de teste')
    await page.keyboard.press('Enter')
    await expect(page.locator('.file-status')).toHaveText('Salvo só neste navegador')

    const [download] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')])
    expect(download.suggestedFilename()).toBe('Casa de teste.planbuilder.json')
    const file = testInfo.outputPath('projeto.planbuilder.json')
    await download.saveAs(file)
    const saved = JSON.parse(readFileSync(file, 'utf8'))
    expect(saved.app).toBe('planbuilder')
    expect(saved.schemaVersion).toBe(1)
    expect(count(saved.project.walls)).toBe(4)
    expect(count(saved.project.openings)).toBe(1)
    await expect(page.locator('.file-status')).toHaveText('Salvo em arquivo')

    // exportar PNG
    await page.getByRole('button', { name: 'Exportar PNG' }).click()
    await page.getByLabel('Quadro de áreas abaixo do desenho').check()
    const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar', exact: true }).click()])
    expect(png.suggestedFilename()).toBe('Casa de teste.png')
    const pngFile = testInfo.outputPath('planta.png')
    await png.saveAs(pngFile)
    const bytes = readFileSync(pngFile)
    expect(bytes.subarray(1, 4).toString()).toBe('PNG')
    expect(bytes.length).toBeGreaterThan(20_000)

    // alterar e criar novo: pede confirmação
    await drawRoom(page, 250, -150, '100x100')
    await expect(page.locator('.file-status')).toHaveText('Alterações não salvas no arquivo')
    await page.getByRole('button', { name: 'Novo' }).click()
    await expect(page.getByText('Criar um novo projeto?')).toBeVisible()
    await page.getByRole('button', { name: 'Descartar e criar novo' }).click()
    await expect(page.locator('.status-areas')).toBeHidden()

    // reabrir o arquivo salvo
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Control+o')])
    await chooser.setFiles(file)
    await expect(page.locator('.project-name')).toHaveValue('Casa de teste')
    await expectAreas(page, '13,07 m²', '10,97 m²')
    await expect(page.locator('.file-status')).toHaveText('Salvo em arquivo')

    // arquivo que não é projeto: avisa e mantém o atual
    const [chooser2] = await Promise.all([page.waitForEvent('filechooser'), page.keyboard.press('Control+o')])
    await chooser2.setFiles({ name: 'foto.json', mimeType: 'application/json', buffer: Buffer.from('{"oi":1}') })
    await expect(page.locator('.toast.error')).toContainText('foto.json')
    await expect(page.locator('.project-name')).toHaveValue('Casa de teste')
  })

  test('vista 3D abre e acompanha a planta', async ({ page }) => {
    await openApp(page)
    await drawRoom(page, -150, -120, '300x240')
    await placeFromLibrary(page, 'Porta de giro simples', -20, 110)
    await page.getByRole('radio', { name: 'Dividido' }).click()
    const scene = page.locator('[data-testid=scene3d] canvas')
    await expect(scene).toBeVisible({ timeout: 30_000 })
    await expect(page.locator('[data-testid=canvas2d] canvas').first()).toBeVisible()
    await page.getByRole('radio', { name: '3D', exact: true }).click()
    await expect(scene).toBeVisible()
    await expect(page.locator('[data-testid=canvas2d]')).toBeHidden()
    await expect(page.locator('[data-testid=scene3d]')).toHaveAttribute('data-ready', 'true')

    // a vista 3D pode ser exportada
    await page.keyboard.press('Control+Shift+e')
    await expect(page.getByRole('radio', { name: 'Vista 3D' })).toHaveAttribute('aria-checked', 'true')
    const [png] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar', exact: true }).click()])
    expect(png.suggestedFilename()).toContain('3D.png')
  })
})

test.describe('produtividade', () => {
  test('copiar e colar, bloquear, paleta de comandos e histórico', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await openApp(page)
    await drawRoom(page, -300, -100, '200x200')
    const w = await world(page)
    await page.keyboard.press('v')
    await page.keyboard.press('Control+a')
    await page.keyboard.press('Control+c')
    await w.move(150, 0)
    await page.keyboard.press('Control+v')
    await page.getByRole('tab', { name: 'Áreas' }).click()
    await expect(page.getByText('Cômodos (2)')).toBeVisible()

    // bloquear pelo botão direito: a parede deixa de ser selecionável
    await page.keyboard.press('Escape')
    await w.click(-200, -100, { button: 'right' })
    await page.getByRole('menuitem', { name: 'Bloquear' }).click()
    await page.getByRole('tab', { name: 'Propriedades' }).click()
    await w.click(-200, -100)
    await expect(page.locator('.props-title')).toHaveText('Paredes novas')
    await w.click(-200, -100, { button: 'right' })
    await page.getByRole('menuitem', { name: 'Desbloquear', exact: true }).click()
    await expect(page.locator('.props-title')).toHaveText('Parede')

    // paleta de comandos
    await page.keyboard.press('Control+k')
    await page.keyboard.type('grade')
    await page.keyboard.press('Enter')
    await expect(page.locator('.layers button')).toContainText('1 ocultas')

    // histórico: voltar ao início e ao fim
    await page.getByRole('tab', { name: 'Histórico' }).click()
    await expect(page.locator('.history-row')).toHaveText(['Início', 'Cômodo criado', 'Colado', 'Objeto bloqueado', 'Objeto desbloqueado'])
    await page.locator('.history-row', { hasText: 'Cômodo criado' }).click()
    expect(count((await savedProject(page))?.walls)).toBe(4)
    await page.locator('.history-row', { hasText: 'Colado' }).click()
    expect(count((await savedProject(page))?.walls)).toBe(8)
  })

  test('cota, texto e atalhos', async ({ page }) => {
    await openApp(page)
    await drawRoom(page, -200, -150, '400x300')
    const w = await world(page)
    await page.keyboard.press('d')
    await w.click(-200, -150)
    await w.click(200, -150)
    await w.click(0, -200)
    await page.keyboard.press('t')
    await w.click(0, 0)
    await page.keyboard.type('Planta baixa')
    await page.keyboard.press('Enter')
    const p = await savedProject(page)
    expect(count(p?.dimensions)).toBe(1)
    expect(Object.values(p?.texts ?? {}).map((t) => (t as { text: string }).text)).toEqual(['Planta baixa'])

    await page.keyboard.press('v')
    await page.keyboard.press('Shift+?')
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeVisible()
    await expect(page.getByText('Girar 90° no sentido horário')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', { name: 'Atalhos de teclado' })).toBeHidden()
  })
})

test('arrastar com Ctrl ou Shift trava a direção e não muda ângulos', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)
  // parede interna: divide a parede de cima em dois trechos
  await page.keyboard.press('w')
  await w.click(50, -150)
  await w.click(50, 150)
  await page.keyboard.press('Escape')
  await page.keyboard.press('v')

  // arrasta o trecho da esquerda da parede de cima para cima, segurando Ctrl só depois do clique
  await w.move(-100, -150)
  await page.mouse.down()
  await w.move(-95, -170)
  await page.keyboard.down('Control')
  await w.move(-80, -200)
  await page.mouse.up()
  await page.keyboard.up('Control')

  const p = (await savedProject(page)) as unknown as { walls: Record<string, { a: string; b: string }>; nodes: Record<string, { x: number; y: number }> }
  // todas as paredes continuam horizontais ou verticais
  for (const wall of Object.values(p.walls)) {
    const a = p.nodes[wall.a]!
    const b = p.nodes[wall.b]!
    expect(a.x === b.x || a.y === b.y).toBe(true)
  }
  // e a parede de cima inteira subiu 50 cm
  expect(Object.values(p.nodes).filter((n) => n.y === -200)).toHaveLength(3)
})

test('painel de gesso junto à parede não vira cômodo; divisória divide', async ({ page }) => {
  await openApp(page)
  await drawRoom(page, -200, -150, '400x300')
  const w = await world(page)

  // painel de TV de 4,5 cm, com um vão para os cabos atrás
  await page.keyboard.press('w')
  await page.locator('.tool-options').getByRole('radio', { name: 'Painel' }).click()
  await w.click(-180, -50)
  await w.click(-180, 50)
  await page.keyboard.press('Escape')
  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.getByText('Cômodos (1)')).toBeVisible()
  await expect(page.locator('.area-row', { hasText: 'Painel' })).toContainText('1,00 m')

  // divisória de drywall no meio: aí sim são dois cômodos
  await page.locator('.tool-options').getByRole('radio', { name: 'Divisória' }).click()
  await w.click(50, -150)
  await w.click(50, 150)
  await page.keyboard.press('Escape')
  await expect(page.getByText('Cômodos (2)')).toBeVisible()

  // converter a divisória em painel pelo painel de propriedades: volta a ser um cômodo só
  await page.keyboard.press('v')
  await page.getByRole('tab', { name: 'Propriedades' }).click()
  await w.click(50, 0)
  await expect(page.locator('.props-title')).toHaveText('Divisória')
  await page.locator('.props').getByRole('radio', { name: 'Painel' }).click()
  await expect(page.locator('.props-title')).toHaveText('Painel')
  await expect(page.locator('.field:has-text("Espessura") input')).toHaveValue('4,5')
  await page.getByRole('tab', { name: 'Áreas' }).click()
  await expect(page.getByText('Cômodos (1)')).toBeVisible()
})
