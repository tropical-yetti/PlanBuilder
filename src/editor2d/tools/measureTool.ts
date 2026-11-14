import type { Point } from '../../model/types'
import { snapPoint } from '../snapping'
import { project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool } from './types'

/**
 * Medir: fita métrica temporária. Clique em dois pontos para ver a distância;
 * a medida fica na tela até o próximo clique ou Esc, e não é salva no projeto.
 */
export function createMeasureTool(): Tool {
  let a: Point | null = null
  let done = false

  const snapFor = (e: PointerInfo) =>
    snapPoint(project(), e.world, { pxPerCm: pxPerCm(), from: a && !done && e.shift ? a : undefined, shift: e.shift, alt: e.alt })

  function clear() {
    a = null
    done = false
    ui().set({ draft: null, snap: null })
  }

  return {
    cursor: () => 'crosshair',

    onPointerMove(e) {
      const s = snapFor(e)
      ui().set({ cursor: e.world, snap: s })
      if (a && !done) ui().set({ draft: { kind: 'measure', a, b: s.point } })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const s = snapFor(e)
      if (!a || done) {
        a = s.point
        done = false
        ui().set({ draft: { kind: 'measure', a, b: s.point } })
      } else {
        done = true
        ui().set({ draft: { kind: 'measure', a, b: s.point } })
      }
    },

    onKeyDown(e) {
      if (e.key === 'Escape' && a) {
        clear()
        return true
      }
      return false
    },

    onDeactivate: clear,
  }
}
