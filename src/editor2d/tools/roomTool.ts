import { dist } from '../../model/geometry'
import { parseSize } from '../../model/units'
import { drawRectRoom } from '../../model/walls'
import type { Point } from '../../model/types'
import { snapPoint } from '../snapping'
import { docStore, project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool } from './types'

/**
 * Cômodo retangular: clique e arraste (ou clique em dois cantos) para criar 4 paredes.
 * Depois do primeiro canto, digitar "400x300" + Enter cria com a medida exata (pelo eixo das paredes),
 * na direção em que o cursor está.
 */
export function createRoomTool(): Tool {
  let a: Point | null = null
  let pressScreen: Point | null = null
  let last: Point | null = null

  const snapFor = (e: PointerInfo) => snapPoint(project(), e.world, { pxPerCm: pxPerCm(), alt: e.alt })

  function reset() {
    a = null
    pressScreen = null
    ui().set({ draft: null, typed: '' })
  }

  function create(b: Point) {
    const from = a
    if (!from || Math.abs(b.x - from.x) < 1 || Math.abs(b.y - from.y) < 1) {
      reset()
      return
    }
    docStore().update('Cômodo criado', (d) => {
      drawRectRoom(d, from, b)
    })
    reset()
  }

  return {
    cursor: () => 'crosshair',

    onPointerMove(e) {
      const s = snapFor(e)
      last = s.point
      ui().set({ cursor: e.world, snap: s, draft: a ? { kind: 'room', a, b: s.point } : null })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const s = snapFor(e)
      if (!a) {
        a = s.point
        pressScreen = e.screen
        ui().set({ typed: '', draft: { kind: 'room', a, b: s.point } })
        return
      }
      create(s.point)
    },

    onPointerUp(e) {
      if (a && pressScreen && dist(e.screen, pressScreen) > 5) create(snapFor(e).point)
      pressScreen = null
    },

    onKeyDown(e) {
      if (!a) return false
      const typed = ui().typed
      if (e.key === 'Escape') {
        reset()
        return true
      }
      if (e.key === 'Enter') {
        const size = parseSize(typed)
        if (size) {
          const sx = last && last.x < a.x ? -1 : 1
          const sy = last && last.y < a.y ? -1 : 1
          create({ x: a.x + sx * size.w, y: a.y + sy * size.h })
        } else {
          ui().set({ typed: '' })
        }
        return true
      }
      if (e.key === 'Backspace') {
        ui().set({ typed: typed.slice(0, -1) })
        return true
      }
      if (/^[0-9.,xX×*mM]$/.test(e.key)) {
        ui().set({ typed: typed + e.key.toLowerCase() })
        return true
      }
      return false
    },

    onDeactivate: reset,
  }
}
