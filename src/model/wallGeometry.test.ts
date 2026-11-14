import { describe, expect, it } from 'vitest'
import { polygonArea } from './geometry'
import { emptyProject } from './testUtils'
import { wallPolygons } from './wallGeometry'
import { drawRectRoom, drawWallSegment } from './walls'

const P = (x: number, y: number) => ({ x, y })
const round = (pts: { x: number; y: number }[]) => pts.map((q) => `${Math.round(q.x * 10) / 10},${Math.round(q.y * 10) / 10}`).sort()

describe('wallPolygons', () => {
  it('parede solta é um retângulo com a espessura', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    const [poly] = [...wallPolygons(p).values()]
    expect(round(poly!.points)).toEqual(round([P(0, -7.5), P(400, -7.5), P(400, 0), P(400, 7.5), P(0, 7.5), P(0, 0)]))
    expect(polygonArea(poly!.points)).toBeCloseTo(400 * 15)
  })

  it('cômodo retangular tem cantos em esquadria fechados', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300), { thickness: 20, height: 280 })
    const polys = [...wallPolygons(p).values()]
    const all = new Set(polys.flatMap((w) => round(w.points)))
    // Cantos externos e internos do cômodo
    for (const c of ['-10,-10', '410,-10', '410,310', '-10,310', '10,10', '390,10', '390,290', '10,290']) {
      expect(all.has(c)).toBe(true)
    }
    // Soma das áreas = área externa - área interna (sem sobreposição)
    const total = polys.reduce((s, w) => s + polygonArea(w.points), 0)
    expect(total).toBeCloseTo(420 * 320 - 380 * 280)
  })

  it('junção em T não sobrepõe paredes', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0), { thickness: 20, height: 280 })
    drawWallSegment(p, P(200, 0), P(200, 300), { thickness: 10, height: 280 })
    const polys = [...wallPolygons(p).values()]
    const total = polys.reduce((s, w) => s + polygonArea(w.points), 0)
    // parede horizontal inteira (400×20) + haste vertical a partir da face (290×10): sem buracos nem sobreposição
    expect(total).toBeCloseTo(400 * 20 + 290 * 10)
  })

  it('usa o resultado em cache enquanto a geometria não muda', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    expect(wallPolygons(p)).toBe(wallPolygons(p))
  })
})
