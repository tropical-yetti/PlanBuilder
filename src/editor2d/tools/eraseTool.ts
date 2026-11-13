import { deleteLabel, deleteObjects } from '../../model/selection'
import { hitTest } from '../hitTest'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { Tool } from './types'

/** Excluir: clique numa parede, porta, janela, cota ou texto para apagar (a parede leva junto suas portas e janelas). */
export function createEraseTool(): Tool {
  return {
    cursor: () => (ui().hover ? 'pointer' : 'crosshair'),

    onPointerMove(e) {
      ui().set({ cursor: e.world, hover: hitTest(project(), e.world, pxPerCm(), { nodes: false }) })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const hit = hitTest(project(), e.world, pxPerCm(), { nodes: false })
      if (!hit) return
      const id = hit.id
      docStore().update(deleteLabel(project(), [id]), (d) => deleteObjects(d, [id]))
      editor().setSelection(editor().selection.filter((s) => s !== id))
      ui().set({ hover: null })
    },

    onDeactivate() {
      ui().set({ hover: null })
    },
  }
}
