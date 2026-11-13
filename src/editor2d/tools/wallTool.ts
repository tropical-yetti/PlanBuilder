import { add, dist, normalize, scale, sub } from '../../model/geometry'
import { parseLength } from '../../model/units'
import { drawWallSegment, NODE_TOL, nodePos } from '../../model/walls'
import type { Point } from '../../model/types'
import { snapPoint } from '../snapping'
import { docStore, project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool, ToolKey } from './types'

/**
 * Ferramenta Parede: cada clique cria um segmento encadeado ao anterior.
 * Digitar um número + Enter define o comprimento exato; Esc, Enter vazio ou duplo clique encerram;
 * clicar no ponto inicial fecha o contorno e encerra.
 */
export function createWallTool(): Tool {
  let chainStart: Point | null = null
  let start: Point | null = null
  let last: Point | null = null

  const snapFor = (e: PointerInfo) =>
    snapPoint(project(), e.world, { pxPerCm: pxPerCm(), from: start ?? undefined, shift: e.shift, alt: e.alt })

  function finish() {
    chainStart = null
    start = null
    ui().set({ draft: null, typed: '' })
  }

  function commitTo(end: Point) {
    if (!start || dist(start, end) < 1) return
    const from = start
    let endNode = ''
    docStore().update('Parede criada', (d) => {
      endNode = drawWallSegment(d, from, end).endNode
    })
    const endPos = nodePos(project(), endNode)
    if (chainStart && dist(endPos, chainStart) <= NODE_TOL) {
      finish()
      return
    }
    start = endPos
    ui().set({ typed: '', draft: { kind: 'wall', a: endPos, b: last ?? endPos } })
  }

  return {
    cursor: () => 'crosshair',

    onPointerMove(e) {
      const s = snapFor(e)
      last = s.point
      ui().set({ cursor: e.world, snap: s, draft: start ? { kind: 'wall', a: start, b: s.point } : null })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const s = snapFor(e)
      last = s.point
      if (!start) {
        start = s.point
        chainStart = s.point
        ui().set({ typed: '', draft: { kind: 'wall', a: start, b: s.point } })
        return
      }
      commitTo(s.point)
    },

    onDoubleClick() {
      finish()
    },

    onKeyDown(e: ToolKey) {
      if (!start) return false
      const typed = ui().typed
      if (e.key === 'Escape') {
        finish()
        return true
      }
      if (e.key === 'Enter') {
        const length = typed ? parseLength(typed) : null
        if (length) {
          const target = last ?? add(start, { x: 1, y: 0 })
          let dir = normalize(sub(target, start))
          if (dir.x === 0 && dir.y === 0) dir = { x: 1, y: 0 }
          commitTo(add(start, scale(dir, length)))
        } else if (!typed) {
          finish()
        } else {
          ui().set({ typed: '' })
        }
        return true
      }
      if (e.key === 'Backspace') {
        ui().set({ typed: typed.slice(0, -1) })
        return true
      }
      if (/^[0-9]$/.test(e.key) || ((e.key === ',' || e.key === '.') && !/[.,]/.test(typed)) || (e.key.toLowerCase() === 'm' && typed !== '')) {
        ui().set({ typed: typed + e.key.toLowerCase() })
        return true
      }
      return false
    },

    onDeactivate: finish,
  }
}
