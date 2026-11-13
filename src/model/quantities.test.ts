import { describe, expect, it } from 'vitest'
import { addOpening } from './openings'
import { quantities, roomAt } from './quantities'
import { renameRoom } from './roomNames'
import { emptyProject } from './testUtils'
import type { Project } from './types'
import { drawRectRoom, drawWallSegment, findWallAt } from './walls'

const P = (x: number, y: number) => ({ x, y })
const H = 280 // altura padrão
// Valores de referência calculados à mão. Paredes de 15 cm, medidas pelo eixo.

function opening(p: Project, at: { x: number; y: number }, componentId: string, width: number, height: number, sillHeight: number) {
  const hit = findWallAt(p, at, 1)!
  const w = p.walls[hit.wallId]!
  const a = p.nodes[w.a]!
  const offset = Math.hypot(at.x - a.x, at.y - a.y)
  return addOpening(p, { wallId: w.id, componentId, offset, width, height, sillHeight, flipSide: false, flipHinge: false, params: {} })
}

describe('quantitativos', () => {
  it('projeto vazio', () => {
    const q = quantities(emptyProject())
    expect(q.rooms).toEqual([])
    expect(q.totalArea).toBe(0)
    expect(q.wallSurface).toEqual({ internal: 0, external: 0 })
  })

  it('cômodo único de 4 × 3 m', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    const q = quantities(p)
    expect(q.rooms).toHaveLength(1)
    const r = q.rooms[0]!
    expect(r.name).toBe('Cômodo 1')
    expect(r.area).toBeCloseTo(385 * 285) // interno: 4,00 − 0,15 por 3,00 − 0,15
    expect(r.perimeter).toBeCloseTo(2 * (385 + 285))
    expect(q.totalArea).toBeCloseTo(415 * 315) // externo: + 0,15 em cada direção
    expect(q.usefulArea).toBeCloseTo(385 * 285)
    expect(q.wallPlanArea).toBeCloseTo(415 * 315 - 385 * 285)
    expect(q.totalArea).toBeCloseTo(q.usefulArea + q.wallPlanArea)
    expect(q.externalPerimeter).toBeCloseTo(2 * (415 + 315))
    expect(q.wallSurface.internal).toBeCloseTo(2 * (385 + 285) * H)
    expect(q.wallSurface.external).toBeCloseTo(2 * (415 + 315) * H)
    expect(r.wallArea).toBeCloseTo(q.wallSurface.internal)
    expect(q.wallLength).toBeCloseTo(1400)
    expect(r.labelPoint).toEqual(P(200, 150))
  })

  it('dois cômodos com parede compartilhada', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(250, 0), P(250, 300))
    const q = quantities(p)
    expect(q.rooms.map((r) => r.name)).toEqual(['Cômodo 1', 'Cômodo 2'])
    expect(q.rooms.map((r) => Math.round(r.area))).toEqual([235 * 285, 135 * 285])
    expect(q.totalArea).toBeCloseTo(415 * 315)
    expect(q.totalArea).toBeCloseTo(q.usefulArea + q.wallPlanArea)
    // as duas faces da parede do meio são internas
    expect(q.wallSurface.internal).toBeCloseTo((2 * (235 + 285) + 2 * (135 + 285)) * H)
    expect(q.wallSurface.external).toBeCloseTo(2 * (415 + 315) * H)
  })

  it('porta e janela são descontadas das duas faces da parede', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    opening(p, P(200, 0), 'door.swing-single', 80, 210, 0)
    opening(p, P(400, 150), 'window.sliding', 120, 120, 100)
    const q = quantities(p)
    const holes = 80 * 210 + 120 * 120
    expect(q.openingsArea).toBe(holes)
    expect(q.wallSurface.internal).toBeCloseTo(2 * (385 + 285) * H - holes)
    expect(q.wallSurface.external).toBeCloseTo(2 * (415 + 315) * H - holes)
    expect(q.rooms[0]!.area).toBeCloseTo(385 * 285) // vãos não mudam a área do piso
    expect(q.openingCounts).toEqual([
      { componentId: 'door.swing-single', count: 1 },
      { componentId: 'window.sliding', count: 1 },
    ])
  })

  it('janela mais alta que a parede desconta só o que cabe', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    opening(p, P(200, 0), 'window.fixed', 100, 250, 100) // cabe 280 − 100 = 180
    expect(quantities(p).openingsArea).toBe(100 * 180)
  })

  it('planta em L', () => {
    const p = emptyProject()
    const pts = [P(0, 0), P(600, 0), P(600, 200), P(300, 200), P(300, 500), P(0, 500)]
    pts.forEach((a, i) => drawWallSegment(p, a, pts[(i + 1) % pts.length]!))
    const q = quantities(p)
    // interno: 585×185 + 285×300 ; externo: 615×215 + 315×300
    expect(q.rooms[0]!.area).toBeCloseTo(585 * 185 + 285 * 300)
    expect(q.totalArea).toBeCloseTo(615 * 215 + 315 * 300)
    expect(q.rooms[0]!.perimeter).toBeCloseTo(585 + 185 + 300 + 300 + 285 + 485)
    expect(q.externalPerimeter).toBeCloseTo(2 * (615 + 515))
  })

  it('parede solta entra na área de paredes, mas não cria cômodo', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(200, 0))
    const q = quantities(p)
    expect(q.rooms).toHaveLength(0)
    expect(q.wallPlanArea).toBeCloseTo(200 * 15)
    expect(q.totalArea).toBeCloseTo(200 * 15)
    expect(q.wallSurface).toEqual({ internal: 0, external: 2 * 200 * H })
  })

  it('parede solta dentro do cômodo desconta do piso e conta como face interna', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(200, 0), P(200, 150)) // meia parede: 142,5 cm além da face, 15 de espessura
    const q = quantities(p)
    expect(q.rooms).toHaveLength(1)
    expect(q.rooms[0]!.area).toBeCloseTo(385 * 285 - 142.5 * 15)
    expect(q.totalArea).toBeCloseTo(415 * 315)
    expect(q.wallSurface.external).toBeCloseTo(2 * (415 + 315) * H)
  })

  it('cômodo-ilha dentro de outro é descontado do de fora', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(1000, 800))
    drawRectRoom(p, P(400, 300), P(600, 500))
    const q = quantities(p)
    const areas = q.rooms.map((r) => Math.round(r.area)).sort((a, b) => a - b)
    expect(areas).toEqual([185 * 185, 985 * 785 - 215 * 215])
    expect(q.totalArea).toBeCloseTo(1015 * 815)
  })

  it('nomes: ficam presos ao ponto e sobrevivem à divisão do cômodo', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    renameRoom(p, quantities(p).rooms[0]!, '  Sala ')
    expect(quantities({ ...p }).rooms[0]).toMatchObject({ name: 'Sala', named: true })
    // dividir: o ponto do nome (200,150) fica no cômodo da esquerda
    drawWallSegment(p, P(250, 0), P(250, 300))
    expect(quantities({ ...p }).rooms.map((r) => r.name)).toEqual(['Sala', 'Cômodo 1'])
    // renomear de novo substitui; nome vazio volta ao automático
    renameRoom(p, roomAt({ ...p }, P(100, 100))!, 'Quarto')
    expect(Object.keys(p.roomLabels)).toHaveLength(1)
    renameRoom(p, roomAt({ ...p }, P(100, 100))!, '')
    expect(quantities({ ...p }).rooms.map((r) => r.name)).toEqual(['Cômodo 1', 'Cômodo 2'])
  })
})
