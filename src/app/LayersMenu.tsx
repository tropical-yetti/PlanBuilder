import { useEffect, useRef, useState } from 'react'
import { LAYER_LABELS, useEditorStore, type Layers } from '../store/editorStore'

/** Menu "Camadas" da barra de status: mostra ou oculta partes do desenho. */
export function LayersMenu() {
  const layers = useEditorStore((s) => s.layers)
  const toggle = useEditorStore((s) => s.toggleLayer)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const hidden = Object.values(layers).filter((v) => !v).length

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onDown, { capture: true })
    return () => window.removeEventListener('pointerdown', onDown, { capture: true })
  }, [open])

  return (
    <div className="layers" ref={ref}>
      <button type="button" className="status-zoom" aria-expanded={open} onClick={() => setOpen(!open)} title="Mostrar ou ocultar partes do desenho">
        Camadas{hidden > 0 ? ` (${hidden} ocultas)` : ''}
      </button>
      {open && (
        <div className="layers-popup" role="menu">
          {(Object.keys(LAYER_LABELS) as (keyof Layers)[]).map((key) => (
            <label key={key} className="layers-item">
              <input type="checkbox" checked={layers[key]} onChange={() => toggle(key)} />
              {LAYER_LABELS[key]}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
