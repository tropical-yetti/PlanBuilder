import { describe, expect, it } from 'vitest'
import { isOpeningValid } from './openings'
import { quantities } from './quantities'
import { createSampleProject } from './sample'
import { parseProjectData } from '../persistence/schema'

describe('projeto de exemplo', () => {
  const p = createSampleProject()

  it('tem quatro cômodos com nome, quatro portas e quatro janelas', () => {
    const q = quantities(p)
    expect(q.rooms.map((r) => r.name).sort()).toEqual(['Banheiro', 'Cozinha', 'Quarto', 'Sala'])
    expect(q.rooms.every((r) => r.named)).toBe(true)
    const ids = Object.values(p.openings).map((o) => o.componentId.split('.')[0])
    expect(ids.filter((k) => k === 'door')).toHaveLength(4)
    expect(ids.filter((k) => k === 'window')).toHaveLength(4)
    expect(ids.filter((k) => k === 'cobogo')).toHaveLength(1)
    expect(q.totalArea).toBeCloseTo(815 * 615)
  })

  it('tem móveis e um cobogó', () => {
    expect(Object.values(p.items).map((it) => it.componentId).sort()).toEqual([
      'appliance.dishwasher-14',
      'appliance.fridge-duplex',
      'appliance.stove-4',
      'furniture.armchair',
      'furniture.bed-double',
      'furniture.sofa-3',
      'furniture.table-round',
      'kitchen.sink-cabinet',
      'kitchen.wall-cabinet',
    ])
    // o sofá encostou na parede da esquerda, de frente para a sala
    expect(Object.values(p.items).find((it) => it.componentId === 'furniture.sofa-3')).toMatchObject({ x: 52.5, rotation: 270 })
    expect(quantities(p).cobogo.area).toBe(200 * 50)
  })

  it('todas as aberturas estão em posição válida', () => {
    for (const o of Object.values(p.openings)) expect(isOpeningValid(p, o.wallId, o.offset, o.width, o.id), o.componentId).toBe(true)
  })

  it('passa pela validação de arquivo sem correções', () => {
    const r = parseProjectData(JSON.parse(JSON.stringify(p)))
    expect(r.ok && r.warnings).toEqual([])
  })
})
