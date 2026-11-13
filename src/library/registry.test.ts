import { describe, expect, it } from 'vitest'
import { CATEGORIES } from './categories'
import { COMPONENTS, getComponent, listByCategory, searchComponents, UNKNOWN_COMPONENT } from './registry'

describe('biblioteca', () => {
  it('tem 4 portas e 4 janelas, com ids únicos', () => {
    expect(listByCategory('doors')).toHaveLength(4)
    expect(listByCategory('windows')).toHaveLength(4)
    expect(new Set(COMPONENTS.map((c) => c.id)).size).toBe(COMPONENTS.length)
  })

  it('todo componente é coerente com o contrato', () => {
    for (const c of COMPONENTS) {
      expect(CATEGORIES.find((k) => k.id === c.category)?.available, c.id).toBe(true)
      expect(c.id.startsWith(c.category === 'doors' ? 'door.' : 'window.'), c.id).toBe(true)
      const { width, height } = c.defaults
      expect(width >= c.limits.minWidth && width <= c.limits.maxWidth, c.id).toBe(true)
      expect(height >= c.limits.minHeight && height <= c.limits.maxHeight, c.id).toBe(true)
      for (const w of c.presets ?? []) expect(w >= c.limits.minWidth && w <= c.limits.maxWidth, `${c.id} preset ${w}`).toBe(true)
      expect(c.hasSill, c.id).toBe(c.category === 'windows')
      for (const f of c.paramsSchema ?? []) expect(c.defaults.params[f.key], `${c.id}.${f.key}`).toBeDefined()
    }
  })

  it('todo símbolo desenha algo e só com números válidos, em vários tamanhos', () => {
    for (const c of COMPONENTS) {
      for (const width of [c.limits.minWidth, c.defaults.width, c.limits.maxWidth]) {
        for (const thickness of [5, 15, 40]) {
          const prims = c.symbol({ width, thickness, params: c.defaults.params })
          expect(prims.length, c.id).toBeGreaterThan(0)
          const nums = prims.flatMap((p) => (p.t === 'line' ? p.pts : p.t === 'arc' ? [p.cx, p.cy, p.r, p.a0, p.a1] : [p.x, p.y, p.w, p.h]))
          expect(nums.every(Number.isFinite), c.id).toBe(true)
        }
      }
    }
  })

  it('todo modelo 3D cabe no vão e só tem medidas válidas', () => {
    for (const c of COMPONENTS) {
      const { width, height } = c.defaults
      const boxes = c.model({ width, height, thickness: 15, params: c.defaults.params })
      if (c.id !== 'door.open-passage') expect(boxes.length, c.id).toBeGreaterThan(0)
      for (const b of boxes) {
        expect([b.x, b.y, b.z, b.w, b.h, b.d].every(Number.isFinite), c.id).toBe(true)
        expect(b.w > 0 && b.h > 0 && b.d > 0, c.id).toBe(true)
        // batente e vidro ficam dentro do vão (folhas de correr e trilhos podem passar para fora)
        if (b.mat === 'glass') {
          expect(Math.abs(b.x) + b.w / 2, c.id).toBeLessThanOrEqual(width / 2 + 1e-6)
          expect(b.y + b.h / 2, c.id).toBeLessThanOrEqual(height + 1e-6)
        }
      }
    }
  })

  it('busca por nome, palavra-chave e categoria, sem depender de acentos', () => {
    expect(searchComponents('vao').map((c) => c.id)).toEqual(['door.open-passage'])
    expect(searchComponents('correr').map((c) => c.id)).toEqual(['door.sliding', 'window.sliding'])
    expect(searchComponents('janela correr').map((c) => c.id)).toEqual(['window.sliding'])
    expect(searchComponents('JANELAS')).toHaveLength(4)
    expect(searchComponents('banheiro').map((c) => c.id)).toEqual(['window.tilt'])
    expect(searchComponents('sofá')).toEqual([])
    expect(searchComponents('  ')).toHaveLength(COMPONENTS.length)
  })

  it('componente desconhecido (projeto de versão futura) não quebra', () => {
    expect(getComponent('door.do-futuro')).toBe(UNKNOWN_COMPONENT)
    expect(getComponent('door.swing-single').name).toBe('Porta de giro simples')
  })
})
