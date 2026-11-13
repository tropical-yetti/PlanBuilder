import { useState } from 'react'
import { useEditorStore } from '../store/editorStore'
import { CATEGORIES, type CategoryId } from './categories'
import { listByCategory, searchComponents } from './registry'
import { SymbolSvg } from './SymbolSvg'
import type { ComponentDef } from './types'

function Card({ def }: { def: ComponentDef }) {
  const placing = useEditorStore((s) => s.placing)
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const setTool = useEditorStore((s) => s.setTool)
  const active = placing === def.id
  return (
    <button
      type="button"
      className={`lib-card ${active ? 'active' : ''}`}
      title={`${def.name} — clique e depois clique na parede, ou arraste para a planta`}
      aria-pressed={active}
      draggable
      onClick={() => (active ? setTool('select') : startPlacing(def.id))}
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', def.id)
        e.dataTransfer.effectAllowed = 'copy'
        startPlacing(def.id)
      }}
      onDragEnd={() => {
        // Solto fora da planta: sai do modo de inserção.
        if (useEditorStore.getState().tool === 'place') setTool('select')
      }}
    >
      <SymbolSvg def={def} size={64} />
      <span className="lib-name">{def.name}</span>
      <span className="lib-size">
        {def.defaults.width} × {def.defaults.height} cm
      </span>
    </button>
  )
}

export function LibraryPanel() {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Set<CategoryId>>(new Set())
  const searching = query.trim() !== ''
  const results = searching ? searchComponents(query) : []

  const toggle = (id: CategoryId) =>
    setClosed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <section className="panel library" aria-label="Biblioteca">
      <h2 className="panel-title">Biblioteca</h2>
      <input
        className="search"
        type="search"
        placeholder="Buscar componentes…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Buscar componentes"
      />

      {searching ? (
        results.length > 0 ? (
          <div className="lib-grid">
            {results.map((def) => (
              <Card key={def.id} def={def} />
            ))}
          </div>
        ) : (
          <p className="empty">Nenhum componente encontrado para “{query.trim()}”.</p>
        )
      ) : (
        CATEGORIES.map((c) => {
          const items = listByCategory(c.id)
          const open = c.available && !closed.has(c.id)
          return (
            <div key={c.id} className="lib-category">
              <button
                type="button"
                className={`lib-category-head ${c.available ? '' : 'soon'}`}
                disabled={!c.available}
                aria-expanded={open}
                onClick={() => toggle(c.id)}
              >
                <span className="chevron">{c.available ? (open ? '▾' : '▸') : ''}</span>
                <span className="lib-category-name">{c.name}</span>
                <span className="badge">{c.available ? items.length : 'em breve'}</span>
              </button>
              {open && (
                <div className="lib-grid">
                  {items.map((def) => (
                    <Card key={def.id} def={def} />
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}
    </section>
  )
}
