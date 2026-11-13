import { describe, expect, it } from 'vitest'
import { polygonArea } from '../model/geometry'
import { addOpening } from '../model/openings'
import { emptyProject } from '../model/testUtils'
import { wallPolygons } from '../model/wallGeometry'
import { drawRectRoom, drawWallSegment } from '../model/walls'
import type { Project } from '../model/types'
import { buildWallPieces } from './buildWalls'

const P = (x: number, y: number) => ({ x, y })
const volume = (p: Project) => buildWallPieces(p).reduce((s, w) => s + polygonArea(w.points) * (w.y1 - w.y0), 0)
const open = (p: Project, wallId: string, offset: number, width: number, height: number, sillHeight: number) =>
  addOpening(p, { wallId, componentId: 'x', offset, width, height, sillHeight, flipSide: false, flipHinge: false, params: {} })

describe('buildWallPieces', () => {
  it('parede sem aberturas é uma peça só, do piso ao topo', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    const pieces = buildWallPieces(p)
    expect(pieces).toHaveLength(1)
    expect(pieces[0]).toMatchObject({ kind: 'solid', y0: 0, y1: 280 })
    expect(volume(p)).toBeCloseTo(400 * 15 * 280)
  })

  it('porta abre o vão do piso até a verga; janela deixa peitoril e verga', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(600, 0)).wallIds
    open(p, w!, 150, 80, 210, 0)
    open(p, w!, 400, 120, 120, 100)
    const kinds = buildWallPieces(p).map((x) => `${x.kind}:${x.y0}-${x.y1}`)
    expect(kinds).toEqual(['solid:0-280', 'lintel:210-280', 'solid:0-280', 'sill:0-100', 'lintel:220-280', 'solid:0-280'])
    expect(volume(p)).toBeCloseTo(600 * 15 * 280 - 80 * 15 * 210 - 120 * 15 * 120)
  })

  it('abertura mais alta que a parede não gera verga', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    open(p, w!, 200, 100, 400, 0)
    expect(buildWallPieces(p).map((x) => x.kind)).toEqual(['solid', 'solid'])
  })

  it('os cantos usam a esquadria do desenho 2D: o volume bate com a planta', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(200, 0), P(200, 300))
    const plan = [...wallPolygons(p).values()].reduce((s, w) => s + polygonArea(w.points), 0)
    expect(volume(p)).toBeCloseTo(plan * 280)
  })

  it('porta colada no canto não gera peça torta', () => {
    const p = emptyProject()
    const [w] = drawRectRoom(p, P(0, 0), P(400, 300))
    open(p, w!, 45, 80, 210, 0) // borda a 5 cm do canto; a esquadria avança 7,5 cm
    for (const piece of buildWallPieces(p)) {
      expect(piece.points.every((q) => Number.isFinite(q.x) && Number.isFinite(q.y))).toBe(true)
      expect(polygonArea(piece.points)).toBeGreaterThanOrEqual(0)
    }
  })
})
