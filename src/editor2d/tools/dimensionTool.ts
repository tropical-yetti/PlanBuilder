import { addDimension, DEFAULT_DIMENSION_OFFSET, offsetToPoint } from '../../model/annotations'
import { dist } from '../../model/geometry'
import type { Id, Point } from '../../model/types'
import { snapPoint } from '../snapping'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool } from './types'

/**
 * Cota: clique nos dois pontos a medir e depois num terceiro ponto para definir
 * o afastamento da linha de cota. Esc cancela.
 */
export function createDimensionTool(): Tool {
  let p1: Point | null = null
  let p2: Point | null = null

  const snapFor = (e: PointerInfo) => snapPoint(project(), e.world, { pxPerCm: pxPerCm(), alt: e.alt })

  function clear() {
    p1 = null
    p2 = null
    ui().set({ draft: null, snap: null })
  }

  const offsetAt = (e: PointerInfo): number => {
    const raw = offsetToPoint(p1!, p2!, e.world)
    return e.alt ? raw : Math.round(raw / 5) * 5
  }

  return {
    cursor: () => 'crosshair',

    onPointerMove(e) {
      if (p1 && p2) {
        ui().set({ cursor: e.world, snap: null, draft: { kind: 'dimension', p1, p2, offset: offsetAt(e) } })
        return
      }
      const s = snapFor(e)
      ui().set({ cursor: e.world, snap: s, draft: p1 ? { kind: 'dimension', p1, p2: s.point, offset: 0 } : null })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      if (!p1) {
        p1 = snapFor(e).point
        return
      }
      if (!p2) {
        const q = snapFor(e).point
        if (dist(p1, q) < 1) return
        p2 = q
        ui().set({ snap: null, draft: { kind: 'dimension', p1, p2, offset: DEFAULT_DIMENSION_OFFSET } })
        return
      }
      const a = p1
      const b = p2
      const offset = offsetAt(e)
      let created: Id | null = null
      docStore().update('Cota criada', (d) => {
        created = addDimension(d, a, b, offset)
      })
      if (created) editor().setSelection([created])
      clear()
    },

    onKeyDown(e) {
      if (e.key === 'Escape' && p1) {
        clear()
        return true
      }
      return false
    },

    onDeactivate: clear,
  }
}
