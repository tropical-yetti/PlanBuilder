import { describe, expect, it } from 'vitest'
import { emptyProject } from '../model/testUtils'
import { drawWallSegment } from '../model/walls'
import { snapPoint } from './snapping'

const P = (x: number, y: number) => ({ x, y })

describe('snapPoint', () => {
  const p = emptyProject()
  drawWallSegment(p, P(0, 0), P(400, 0))

  it('gruda na ponta de parede', () => {
    const s = snapPoint(p, P(404, 3), { pxPerCm: 1 })
    expect(s.kind).toBe('node')
    expect(s.point).toEqual(P(400, 0))
  })

  it('gruda no meio da parede', () => {
    const s = snapPoint(p, P(203, 4), { pxPerCm: 1 })
    expect(s.kind).toBe('midpoint')
    expect(s.point).toEqual(P(200, 0))
  })

  it('gruda no eixo da parede', () => {
    const s = snapPoint(p, P(123, 6), { pxPerCm: 1 })
    expect(s.kind).toBe('wall')
    expect(s.point.y).toBeCloseTo(0)
  })

  it('usa a grade longe de tudo', () => {
    const s = snapPoint(p, P(1234, 567), { pxPerCm: 1 })
    expect(s.kind).toBe('grid')
    expect(s.point).toEqual(P(1230, 570))
  })

  it('trava o ângulo em 90° e arredonda o comprimento', () => {
    const s = snapPoint(emptyProject(), P(1005, 503), { pxPerCm: 1, from: P(1000, 0) })
    expect(s.kind).toBe('angle')
    expect(s.point.x).toBeCloseTo(1000)
    expect(s.point.y).toBeCloseTo(500)
  })

  it('com Shift, trava em passos de 15°', () => {
    const s = snapPoint(emptyProject(), P(100, 30), { pxPerCm: 1, from: P(0, 0), shift: true })
    const deg = (Math.atan2(s.point.y, s.point.x) * 180) / Math.PI
    expect(deg).toBeCloseTo(15)
  })

  it('alinha com nós existentes (linha-guia)', () => {
    const s = snapPoint(p, P(403, 250), { pxPerCm: 1 })
    expect(s.kind).toBe('align')
    expect(s.point.x).toBe(400)
    expect(s.guides).toHaveLength(1)
  })

  it('a tolerância acompanha o zoom', () => {
    // 20 cm de distância: fora do alcance com 1 px/cm (10 cm), dentro com 0,25 px/cm (40 cm)
    expect(snapPoint(p, P(420, 0), { pxPerCm: 1 }).kind).not.toBe('node')
    expect(snapPoint(p, P(420, 0), { pxPerCm: 0.25 }).kind).toBe('node')
  })

  it('Alt desliga os snaps', () => {
    const s = snapPoint(p, P(401, 1), { pxPerCm: 1, alt: true })
    expect(s.kind).toBe('none')
    expect(s.point).toEqual(P(401, 1))
  })
})
