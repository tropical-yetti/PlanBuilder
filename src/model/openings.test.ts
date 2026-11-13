import { describe, expect, it } from 'vitest'
import { addOpening, centerOpening, distancesToEnds, distributeOpenings, fitOpeningsToWalls, isOpeningValid, moveOpening, resizeOpening, type NewOpening } from './openings'
import { emptyProject } from './testUtils'
import { drawWallSegment, setNodePositions, setWallLengthPositions } from './walls'

const P = (x: number, y: number) => ({ x, y })

function setup(length = 400) {
  const p = emptyProject()
  const [wallId] = drawWallSegment(p, P(0, 0), P(length, 0)).wallIds
  const make = (offset: number, width = 80): NewOpening => ({
    wallId: wallId!,
    componentId: 'door.swing-single',
    offset,
    width,
    height: 210,
    sillHeight: 0,
    flipSide: false,
    flipHinge: false,
    params: {},
  })
  return { p, wallId: wallId!, make }
}

describe('aberturas', () => {
  it('insere em posição válida', () => {
    const { p, make } = setup()
    expect(addOpening(p, make(200))).not.toBeNull()
    expect(Object.keys(p.openings)).toHaveLength(1)
  })

  it('recusa fora da parede, colada na ponta ou maior que a parede', () => {
    const { p, wallId, make } = setup()
    expect(addOpening(p, make(20))).toBeNull() // borda em -20
    expect(addOpening(p, make(42))).toBeNull() // borda a 2 cm da ponta (mínimo 5)
    expect(addOpening(p, make(45))).not.toBeNull()
    expect(isOpeningValid(p, wallId, 200, 500)).toBe(false)
  })

  it('recusa sobreposição, mas aceita encostada', () => {
    const { p, make } = setup()
    addOpening(p, make(100))
    expect(addOpening(p, make(170))).toBeNull()
    expect(addOpening(p, make(180))).not.toBeNull()
  })

  it('mover e redimensionar só valem se couber', () => {
    const { p, wallId, make } = setup()
    const a = addOpening(p, make(100))!
    addOpening(p, make(300))
    expect(moveOpening(p, a, wallId, 250)).toBe(false)
    expect(p.openings[a]!.offset).toBe(100)
    expect(moveOpening(p, a, wallId, 200)).toBe(true)
    expect(resizeOpening(p, a, 150)).toBe(false)
    expect(resizeOpening(p, a, 120)).toBe(true)
  })

  it('centraliza na parede', () => {
    const { p, make } = setup()
    const a = addOpening(p, make(100))!
    expect(centerOpening(p, a)).toBe(true)
    expect(distancesToEnds(p, p.openings[a]!)).toEqual({ start: 160, end: 160 })
  })

  it('distribui com espaços iguais', () => {
    const { p, wallId, make } = setup(500)
    const a = addOpening(p, make(60, 100))!
    const b = addOpening(p, make(200, 100))!
    const c = addOpening(p, make(400, 100))!
    expect(distributeOpenings(p, wallId)).toBe(true)
    // 500 - 300 = 200 de sobra → 4 espaços de 50
    expect([a, b, c].map((id) => p.openings[id]!.offset)).toEqual([100, 250, 400])
  })

  it('ao encurtar a parede, traz a abertura para dentro ou a remove', () => {
    const { p, wallId, make } = setup()
    const a = addOpening(p, make(350))!
    setNodePositions(p, setWallLengthPositions(p, wallId, 300, 'start'))
    fitOpeningsToWalls(p)
    expect(p.openings[a]!.offset).toBe(255)
    setNodePositions(p, setWallLengthPositions(p, wallId, 60, 'start'))
    fitOpeningsToWalls(p)
    expect(p.openings[a]).toBeUndefined()
  })
})
