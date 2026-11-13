import { useRef, useState } from 'react'
import { addText, DEFAULT_TEXT_SIZE } from '../model/annotations'
import type { Id } from '../model/types'
import { useEditorStore, worldToScreen, type TextEdit } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

/** Campo sobre a planta para escrever ou editar um texto. Enter confirma, Esc cancela; texto vazio apaga. */
export function TextEditor({ edit }: { edit: TextEdit }) {
  const view = useEditorStore((s) => s.view)
  const size = useProjectStore((s) => (edit.id ? s.project.texts[edit.id]?.size : undefined)) ?? DEFAULT_TEXT_SIZE
  const [text, setText] = useState(edit.initial)
  const at = worldToScreen(view, edit.at)
  // Depois de confirmar ou cancelar, o campo some e ainda pode disparar "blur": não deve confirmar de novo.
  const closed = useRef(false)
  const close = () => {
    closed.current = true
    useEditorStore.getState().setTextEdit(null)
  }

  function commit() {
    if (closed.current) return
    const doc = useProjectStore.getState()
    const clean = text.trim()
    const id = edit.id
    if (id) {
      if (clean === '') doc.update('Texto excluído', (d) => void delete d.texts[id])
      else if (clean !== edit.initial) doc.update('Texto alterado', (d) => void (d.texts[id]!.text = clean))
    } else if (clean !== '') {
      let created: Id | null = null
      doc.update('Texto criado', (d) => {
        created = addText(d, edit.at, clean)
      })
      if (created) useEditorStore.getState().setSelection([created])
    }
    close()
  }

  return (
    <input
      className="text-edit-input"
      style={{ left: at.x, top: at.y, fontSize: Math.max(12, Math.min(40, size * view.scale)) }}
      autoFocus
      value={text}
      placeholder="Texto"
      aria-label="Texto da anotação"
      size={Math.max(8, text.length + 1)}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') commit()
        else if (e.key === 'Escape') close()
      }}
    />
  )
}
