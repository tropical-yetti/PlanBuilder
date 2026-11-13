import { deleteWall } from '../../model/walls'
import { hitWall } from '../hitTest'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { Tool } from './types'

/** Excluir: clique na parede para apagá-la (com suas portas e janelas). */
export function createEraseTool(): Tool {
  return {
    cursor: () => (ui().hover ? 'pointer' : 'crosshair'),

    onPointerMove(e) {
      const id = hitWall(project(), e.world, pxPerCm())
      ui().set({ cursor: e.world, hover: id ? { kind: 'wall', id } : null })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const id = hitWall(project(), e.world, pxPerCm())
      if (!id) return
      docStore().update('Parede excluída', (d) => deleteWall(d, id))
      editor().setSelection(editor().selection.filter((s) => s !== id))
      ui().set({ hover: null })
    },

    onDeactivate() {
      ui().set({ hover: null })
    },
  }
}
