import { deleteOpening } from '../../model/openings'
import { deleteWall } from '../../model/walls'
import { hitTest } from '../hitTest'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { Tool } from './types'

/** Excluir: clique numa porta, janela ou parede para apagá-la (a parede leva junto suas portas e janelas). */
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
      if (hit.kind === 'opening') docStore().update('Abertura excluída', (d) => deleteOpening(d, id))
      else docStore().update('Parede excluída', (d) => deleteWall(d, id))
      editor().setSelection(editor().selection.filter((s) => s !== id))
      ui().set({ hover: null })
    },

    onDeactivate() {
      ui().set({ hover: null })
    },
  }
}
