import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './categories'
import { BED_SIZES } from './components/furniture/beds'
import { rectChairs, roundChairs } from './components/furniture/tables'
import { primNumbers } from './prims'
import {
  COMPONENTS,
  getComponent,
  getItem,
  itemsInGroup,
  listByCategory,
  openingsByCategory,
  searchComponents,
  UNKNOWN_COMPONENT,
  UNKNOWN_ITEM,
} from './registry'
import type { Box3, ItemDef, OpeningDef } from './types'

const openings = COMPONENTS.filter((c): c is OpeningDef => c.kind === 'opening')
const items = COMPONENTS.filter((c): c is ItemDef => c.kind === 'item')
const ids = (list: { id: string }[]) => list.map((c) => c.id)

function checkBoxes(boxes: Box3[], id: string) {
  for (const b of boxes) {
    expect([b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite), id).toBe(true)
    expect(b.w > 0 && b.h > 0 && (b.d > 0 || b.shape === 'cylinder'), id).toBe(true)
  }
}

describe('biblioteca', () => {
  it('tem portas, janelas, cobogós e móveis, com ids únicos', () => {
    expect(listByCategory('doors')).toHaveLength(4)
    expect(listByCategory('windows')).toHaveLength(4)
    expect(ids(openingsByCategory('cobogo'))).toEqual(['cobogo.panel', 'cobogo.band'])
    expect(new Set(ids(COMPONENTS)).size).toBe(COMPONENTS.length)
  })

  it('móveis pedidos: sofás de 2 e 3 lugares, poltrona, três mesas e as camas em todos os tamanhos', () => {
    expect(ids(itemsInGroup('Sofás e poltronas'))).toEqual(['furniture.sofa-2', 'furniture.sofa-3', 'furniture.armchair'])
    expect(ids(itemsInGroup('Mesas'))).toEqual(['furniture.table-square', 'furniture.table-rect', 'furniture.table-round'])
    const beds = itemsInGroup('Camas').map((b) => `${b.name} ${b.defaults.width}×${b.defaults.depth}`)
    expect(beds).toEqual([
      'Cama de solteiro 88×188',
      'Cama de solteirão 96×203',
      'Cama viúva 128×188',
      'Cama de casal 138×188',
      'Cama queen 158×198',
      'Cama king 193×203',
    ])
    expect(BED_SIZES).toHaveLength(6)
  })

  it('toda abertura é coerente com o contrato', () => {
    for (const c of openings) {
      expect(CATEGORIES.find((k) => k.id === c.category)?.available, c.id).toBe(true)
      const { width, height } = c.defaults
      expect(width >= c.limits.minWidth && width <= c.limits.maxWidth, c.id).toBe(true)
      expect(height >= c.limits.minHeight && height <= c.limits.maxHeight, c.id).toBe(true)
      for (const w of c.presets ?? []) expect(w >= c.limits.minWidth && w <= c.limits.maxWidth, `${c.id} preset ${w}`).toBe(true)
      expect(c.hasSill, c.id).toBe(c.category !== 'doors')
      for (const f of c.paramsSchema ?? []) expect(c.defaults.params[f.key], `${c.id}.${f.key}`).toBeDefined()
    }
  })

  it('todo móvel é coerente com o contrato', () => {
    for (const c of items) {
      expect(c.category, c.id).toBe('furniture')
      const { width, depth, height } = c.defaults
      expect(width >= c.limits.minWidth && width <= c.limits.maxWidth, c.id).toBe(true)
      expect(depth >= c.limits.minDepth && depth <= c.limits.maxDepth, c.id).toBe(true)
      expect(height >= c.limits.minHeight && height <= c.limits.maxHeight, c.id).toBe(true)
      for (const pr of c.presets ?? []) {
        expect(pr.width >= c.limits.minWidth && pr.width <= c.limits.maxWidth, `${c.id} ${pr.label}`).toBe(true)
        expect(pr.depth >= c.limits.minDepth && pr.depth <= c.limits.maxDepth, `${c.id} ${pr.label}`).toBe(true)
      }
      if (c.round) expect(width, c.id).toBe(depth)
      for (const f of c.paramsSchema ?? []) expect(c.defaults.params[f.key], `${c.id}.${f.key}`).toBeDefined()
    }
  })

  it('todo símbolo e modelo 3D desenham algo, só com números válidos, em vários tamanhos', () => {
    for (const c of openings) {
      for (const width of [c.limits.minWidth, c.defaults.width, Math.min(c.limits.maxWidth, 600)]) {
        for (const thickness of [5, 15, 40]) {
          const prims = c.symbol({ width, thickness, params: c.defaults.params })
          expect(prims.length, c.id).toBeGreaterThan(0)
          expect(prims.flatMap(primNumbers).every(Number.isFinite), c.id).toBe(true)
          const boxes = c.model({ width, height: c.defaults.height, thickness, params: c.defaults.params })
          if (c.id !== 'door.open-passage') expect(boxes.length, c.id).toBeGreaterThan(0)
          checkBoxes(boxes, c.id)
        }
      }
    }
    for (const c of items) {
      for (const [width, depth] of [
        [c.limits.minWidth, c.limits.minDepth],
        [c.defaults.width, c.defaults.depth],
        [c.limits.maxWidth, c.limits.maxDepth],
      ] as const) {
        for (const params of [c.defaults.params, { ...c.defaults.params, chairs: false }]) {
          const prims = c.symbol({ width, depth, params })
          expect(prims.length, c.id).toBeGreaterThan(0)
          expect(prims.flatMap(primNumbers).every(Number.isFinite), c.id).toBe(true)
          const boxes = c.model({ width, depth, height: c.defaults.height, params })
          expect(boxes.length, c.id).toBeGreaterThan(0)
          checkBoxes(boxes, c.id)
        }
      }
    }
  })

  it('o vidro das janelas fica dentro do vão', () => {
    for (const c of openings) {
      const { width, height } = c.defaults
      for (const b of c.model({ width, height, thickness: 15, params: c.defaults.params })) {
        if (b.mat !== 'glass') continue
        expect(Math.abs(b.x) + b.w / 2, c.id).toBeLessThanOrEqual(width / 2 + 1e-6)
        expect(b.y + b.h / 2, c.id).toBeLessThanOrEqual(height + 1e-6)
      }
    }
  })

  it('lugares das mesas: 60 cm por pessoa', () => {
    expect(rectChairs(90, 90)).toHaveLength(4)
    expect(rectChairs(120, 120)).toHaveLength(8)
    expect(rectChairs(120, 80)).toHaveLength(4) // cabeceira com menos de 90 cm não tem lugar
    expect(rectChairs(160, 90)).toHaveLength(6)
    expect(rectChairs(200, 100)).toHaveLength(8)
    expect(roundChairs(110)).toHaveLength(5)
    expect(roundChairs(150)).toHaveLength(7)
    // a mesa sem cadeiras desenha só o tampo
    const table = getItem('furniture.table-rect')
    expect(table.symbol({ width: 160, depth: 90, params: { chairs: false } })).toHaveLength(1)
  })

  it('busca por nome, palavra-chave, grupo e categoria, sem depender de acentos', () => {
    expect(ids(searchComponents('vao'))).toEqual(['door.open-passage'])
    expect(ids(searchComponents('correr'))).toEqual(['door.sliding', 'window.sliding'])
    expect(ids(searchComponents('janela correr'))).toEqual(['window.sliding'])
    expect(searchComponents('JANELAS')).toHaveLength(4)
    expect(ids(searchComponents('cobogo'))).toEqual(['cobogo.panel', 'cobogo.band'])
    // o grupo "Sofás e poltronas" entra na busca, então a poltrona aparece junto
    expect(ids(searchComponents('sofa'))).toEqual(['furniture.sofa-2', 'furniture.sofa-3', 'furniture.armchair'])
    expect(ids(searchComponents('sofa 3 lugares'))).toEqual(['furniture.sofa-3'])
    expect(ids(searchComponents('casal'))).toEqual(['furniture.bed-double', 'furniture.bed-queen', 'furniture.bed-king'])
    expect(ids(searchComponents('mesa redonda'))).toEqual(['furniture.table-round'])
    expect(searchComponents('camas')).toHaveLength(6)
    expect(searchComponents('geladeira')).toEqual([])
    expect(searchComponents('  ')).toHaveLength(COMPONENTS.length)
  })

  it('componente desconhecido (projeto de versão futura) não quebra', () => {
    expect(getComponent('door.do-futuro')).toBe(UNKNOWN_COMPONENT)
    expect(getComponent('furniture.sofa-2')).toBe(UNKNOWN_COMPONENT) // móvel não é abertura
    expect(getItem('furniture.do-futuro')).toBe(UNKNOWN_ITEM)
    expect(getItem('furniture.sofa-2').name).toBe('Sofá de 2 lugares')
  })
})
