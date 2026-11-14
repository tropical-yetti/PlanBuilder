import { describe, expect, it } from 'vitest'
import { itemCorners, normalizeAngle, pointInItem, resizeItem, snapToWall, toItemLocal } from './items'
import { emptyProject } from './testUtils'
import type { Item } from './types'
import { drawWallSegment } from './walls'

const item = (over: Partial<Item> = {}): Item => ({
  id: 'i',
  componentId: 'furniture.sofa-3',
  x: 0,
  y: 0,
  rotation: 0,
  width: 200,
  depth: 90,
  height: 85,
  mirrored: false,
  params: {},
  ...over,
})
const round = (q: { x: number; y: number }) => ({ x: Math.round(q.x * 100) / 100 + 0, y: Math.round(q.y * 100) / 100 + 0 })

describe('móveis', () => {
  it('cantos giram com o móvel', () => {
    expect(itemCorners(item()).map(round)).toEqual([
      { x: -100, y: -45 },
      { x: 100, y: -45 },
      { x: 100, y: 45 },
      { x: -100, y: 45 },
    ])
    // girado 90°: o fundo (y negativo) passa a ficar à direita (x positivo)
    expect(itemCorners(item({ rotation: 90 })).map(round)[0]).toEqual({ x: 45, y: -100 })
  })

  it('ponto dentro do retângulo girado e do círculo', () => {
    const it90 = item({ rotation: 90 })
    expect(pointInItem(it90, { x: 40, y: 90 }, false)).toBe(true)
    expect(pointInItem(it90, { x: 90, y: 40 }, false)).toBe(false)
    const round = item({ width: 100, depth: 100 })
    expect(pointInItem(round, { x: 45, y: 45 }, false)).toBe(true)
    expect(pointInItem(round, { x: 45, y: 45 }, true)).toBe(false)
    expect(round && toItemLocal(item({ x: 10, y: 10, rotation: 180 }), { x: 0, y: 10 })).toEqual({ x: 10, y: expect.closeTo(0) })
  })

  it('normaliza ângulos', () => {
    expect(normalizeAngle(-90)).toBe(270)
    expect(normalizeAngle(450)).toBe(90)
    expect(normalizeAngle(359.99999)).toBe(0)
  })

  it('encosta o fundo na parede, virado para o lado em que está', () => {
    const p = emptyProject()
    drawWallSegment(p, { x: 0, y: 0 }, { x: 600, y: 0 }) // parede de 15 cm em y = 0
    // abaixo da parede: fundo para cima (rotação 0), centro a 7,5 + 45 cm da linha
    expect(snapToWall(p, { x: 300, y: 70 }, 90, 30)).toMatchObject({ x: 300, y: 52.5, rotation: 0 })
    // acima da parede: girado 180°
    expect(snapToWall(p, { x: 300, y: -60 }, 90, 30)).toMatchObject({ x: 300, y: -52.5, rotation: 180 })
    // longe demais, ou além da ponta: não encosta
    expect(snapToWall(p, { x: 300, y: 200 }, 90, 30)).toBeNull()
    expect(snapToWall(p, { x: 700, y: 60 }, 90, 30)).toBeNull()
  })

  it('parede vertical: o fundo vira para ela', () => {
    const p = emptyProject()
    drawWallSegment(p, { x: 0, y: 0 }, { x: 0, y: 500 })
    // à direita da parede, a frente aponta para +x e o fundo para a parede (rotação 270°)
    expect(snapToWall(p, { x: 60, y: 200 }, 90, 30)).toMatchObject({ x: 52.5, y: 200, rotation: 270 })
    expect(snapToWall(p, { x: -60, y: 200 }, 90, 30)).toMatchObject({ x: -52.5, y: 200, rotation: 90 })
  })

  it('mudar a profundidade mantém o fundo no lugar (móveis de encostar) ou o centro (mesas)', () => {
    // cama girada 90°: o fundo fica à direita (x positivo)
    const bed = item({ x: 141, y: 0, rotation: 90, width: 138, depth: 188 })
    const backBefore = bed.x + bed.depth / 2
    resizeItem(bed, { width: 193, depth: 203 }, true)
    expect(bed.x + bed.depth / 2).toBeCloseTo(backBefore)
    expect(bed).toMatchObject({ width: 193, depth: 203, y: 0 })

    const table = item({ x: 0, y: 0, depth: 90 })
    resizeItem(table, { depth: 120 }, false)
    expect(table).toMatchObject({ x: 0, y: 0, depth: 120 })
  })
})
