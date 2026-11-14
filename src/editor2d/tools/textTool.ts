import { hitText } from '../hitTest'
import { editor, project, ui } from './context'
import type { Tool } from './types'

/** Texto: clique na planta para escrever; clique num texto existente para editá-lo. */
export function createTextTool(): Tool {
  return {
    cursor: () => 'text',

    onPointerMove(e) {
      ui().set({ cursor: e.world })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const p = project()
      const id = hitText(p, e.world)
      const t = id ? p.texts[id] : undefined
      if (t) editor().setTextEdit({ id: t.id, at: { x: t.x, y: t.y }, initial: t.text })
      else editor().setTextEdit({ id: null, at: { x: Math.round(e.world.x), y: Math.round(e.world.y) }, initial: '' })
    },

    onDeactivate() {
      editor().setTextEdit(null)
    },
  }
}
