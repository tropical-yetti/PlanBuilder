import { describe, expect, it } from 'vitest'
import { detectFaces } from './rooms'
import { emptyProject } from './testUtils'
import { drawRectRoom, drawWallSegment } from './walls'

const P = (x: number, y: number) => ({ x, y })

describe('detectFaces', () => {
  it('um retângulo tem uma face fechada e um contorno externo', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    const f = detectFaces(p)
    expect(f.inner).toHaveLength(1)
    expect(f.outer).toHaveLength(1)
    expect(f.inner[0]!.area).toBeCloseTo(120000)
    expect(f.inner[0]!.wallIds).toHaveLength(4)
  })

  it('parede interna divide em dois cômodos', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(250, 0), P(250, 300))
    const areas = detectFaces(p)
      .inner.map((f) => f.area)
      .sort((a, b) => a - b)
    expect(areas).toEqual([45000, 75000])
  })

  it('contorno aberto não forma cômodo', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(400, 0), P(400, 300))
    drawWallSegment(p, P(400, 300), P(0, 300))
    expect(detectFaces(p).inner).toHaveLength(0)
  })

  it('parede solta dentro do cômodo não muda a área da face', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(200, 0), P(200, 150))
    const f = detectFaces(p)
    expect(f.inner).toHaveLength(1)
    expect(f.inner[0]!.area).toBeCloseTo(120000)
  })

  it('planta em L e grupos separados', () => {
    const p = emptyProject()
    const pts = [P(0, 0), P(600, 0), P(600, 200), P(300, 200), P(300, 500), P(0, 500)]
    pts.forEach((a, i) => drawWallSegment(p, a, pts[(i + 1) % pts.length]!))
    drawRectRoom(p, P(1000, 0), P(1200, 200))
    const f = detectFaces(p)
    expect(f.inner.map((x) => Math.round(x.area)).sort((a, b) => a - b)).toEqual([40000, 210000])
    expect(f.outer).toHaveLength(2)
    expect(new Set(f.inner.map((x) => x.component)).size).toBe(2)
  })
})
