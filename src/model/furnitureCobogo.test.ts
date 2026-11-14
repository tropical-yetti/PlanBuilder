import { describe, expect, it } from 'vitest'
import { parseProjectData, parseProjectText, serializeProject } from '../persistence/schema'
import { addItem, type NewItem } from './items'
import { addOpening, fillWall } from './openings'
import { quantities } from './quantities'
import { deleteObjects } from './selection'
import { emptyProject } from './testUtils'
import { copySelection, mirrorSelection, pasteClip, rotateSelection } from './transforms'
import type { Project } from './types'
import { drawRectRoom, drawWallSegment } from './walls'

const sofa = (over: Partial<NewItem> = {}): NewItem => ({
  componentId: 'furniture.sofa-3',
  x: 100,
  y: 0,
  rotation: 0,
  width: 210,
  depth: 90,
  height: 85,
  mirrored: false,
  params: {},
  ...over,
})

function cobogo(p: Project, wallId: string, offset: number, width: number, height: number, sillHeight = 0, pieceSize = 25) {
  return addOpening(p, { wallId, componentId: 'cobogo.panel', offset, width, height, sillHeight, flipSide: false, flipHinge: false, params: { pieceSize } })!
}

describe('móveis no projeto', () => {
  it('girar 90° move o centro e soma o ângulo', () => {
    const p = emptyProject()
    const a = addItem(p, sofa({ x: 100, y: 0 }))
    const b = addItem(p, sofa({ x: -100, y: 0 }))
    rotateSelection(p, [a, b], 90)
    expect(p.items[a]).toMatchObject({ x: 0, y: 100, rotation: 90 })
    expect(p.items[b]).toMatchObject({ x: 0, y: -100, rotation: 90 })
  })

  it('espelhar reflete a posição e o ângulo e inverte o desenho', () => {
    const p = emptyProject()
    // dois sofás simétricos, para o centro da seleção ficar em x = 0
    const a = addItem(p, sofa({ x: 100, y: 0, rotation: 30 }))
    const b = addItem(p, sofa({ x: -100, y: 0, rotation: 330 }))
    mirrorSelection(p, [a, b], 'horizontal')
    expect(p.items[a]).toMatchObject({ x: -100, rotation: 330, mirrored: true })
    mirrorSelection(p, [a, b], 'vertical')
    expect(p.items[a]).toMatchObject({ rotation: 210, mirrored: false })
  })

  it('copiar e colar leva o móvel com medidas e parâmetros', () => {
    const p = emptyProject()
    const a = addItem(p, sofa({ componentId: 'furniture.table-round', width: 120, depth: 120, params: { chairs: false } }))
    const ids = pasteClip(p, JSON.parse(JSON.stringify(copySelection(p, [a]))), { x: 0, y: 300 })
    expect(ids).toHaveLength(1)
    expect(p.items[ids[0]!]).toMatchObject({ componentId: 'furniture.table-round', x: 100, y: 300, width: 120, params: { chairs: false } })
    // os parâmetros da cópia são independentes
    p.items[ids[0]!]!.params.chairs = true
    expect(p.items[a]!.params.chairs).toBe(false)
  })

  it('excluir e salvar/abrir', () => {
    const p = emptyProject()
    const a = addItem(p, sofa({ rotation: 90, mirrored: true }))
    addItem(p, sofa({ componentId: 'furniture.bed-queen', width: 158, depth: 198 }))
    const r = parseProjectText(serializeProject(p))
    expect(r.ok && r.project.items).toEqual(p.items)
    deleteObjects(p, [a])
    expect(Object.keys(p.items)).toHaveLength(1)
  })

  it('arquivo com móvel quebrado: descarta só ele e avisa', () => {
    const p = JSON.parse(JSON.stringify(emptyProject()))
    p.items = { ok: { ...sofa(), id: 'ok' }, ruim: { id: 'ruim', componentId: 'x', x: 0, y: 0, width: -5, depth: 1, height: 1 } }
    const r = parseProjectData(p)
    expect(r.ok && Object.keys(r.project.items)).toEqual(['ok'])
    expect(r.ok && r.warnings).toEqual(['1 móvel inválido foi descartado'])
  })

  it('móveis entram na contagem e não mudam as áreas', () => {
    const p = emptyProject()
    drawRectRoom(p, { x: 0, y: 0 }, { x: 400, y: 300 })
    const before = quantities({ ...p }).usefulArea
    addItem(p, sofa())
    addItem(p, sofa())
    const q = quantities({ ...p })
    expect(q.usefulArea).toBe(before)
    expect(q.itemCounts).toEqual([{ componentId: 'furniture.sofa-3', count: 2 }])
  })
})

describe('cobogó', () => {
  it('é descontado da superfície das paredes e somado como cobogó, com estimativa de peças', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, { x: 0, y: 0 }, { x: 400, y: 0 }).wallIds
    cobogo(p, w!, 200, 150, 280)
    const q = quantities(p)
    expect(q.cobogo.area).toBe(150 * 280)
    // 150/25 = 6 colunas; 280/25 = 11,2 → 12 fileiras
    expect(q.cobogo.pieces).toBe(6 * 12)
    expect(q.wallSurface.external).toBeCloseTo(2 * 400 * 280 - 2 * 150 * 280)
  })

  it('a área considera só o que cabe na parede', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, { x: 0, y: 0 }, { x: 400, y: 0 }).wallIds
    cobogo(p, w!, 200, 100, 100, 220, 20) // da altura 220 até o topo (280): 60 cm
    expect(quantities(p).cobogo).toEqual({ area: 100 * 60, pieces: 5 * 3 })
  })

  it('"ocupar a parede inteira" estica de ponta a ponta, só se a parede estiver livre', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, { x: 0, y: 0 }, { x: 400, y: 0 }).wallIds
    const c = cobogo(p, w!, 100, 100, 280)
    expect(fillWall(p, c)).toBe(true)
    expect(p.openings[c]).toMatchObject({ width: 390, offset: 200 })

    const q = emptyProject()
    const [w2] = drawWallSegment(q, { x: 0, y: 0 }, { x: 400, y: 0 }).wallIds
    const c2 = cobogo(q, w2!, 100, 100, 280)
    addOpening(q, { wallId: w2!, componentId: 'door.swing-single', offset: 320, width: 80, height: 210, sillHeight: 0, flipSide: false, flipHinge: false, params: {} })
    expect(fillWall(q, c2)).toBe(false)
    expect(q.openings[c2]!.width).toBe(100)
  })
})
