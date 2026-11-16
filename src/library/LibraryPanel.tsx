import { useState } from 'react'
import { formatCmValue } from '../model/units'
import { useEditorStore } from '../store/editorStore'
import { CATEGORIES, type CategoryId } from './categories'
import { FloorSwatch } from './FloorSwatch'
import { FLOORS, searchFloors, type FloorDef } from './floors'
import { listByCategory, searchComponents } from './registry'
import { SymbolSvg } from './SymbolSvg'
import type { LibraryDef } from './types'

/** Agrupa os componentes pelo subgrupo ("Camas", "Mesas"...), mantendo a ordem da lista. */
function groupsOf(defs: (LibraryDef | FloorDef)[]): { name: string; defs: (LibraryDef | FloorDef)[] }[] {
  const groups: { name: string; defs: (LibraryDef | FloorDef)[] }[] = []
  for (const d of defs) {
    const name = d.kind === 'item' || d.kind === 'floor' ? d.group : ''
    const g = groups.find((x) => x.name === name)
    if (g) g.defs.push(d)
    else groups.push({ name, defs: [d] })
  }
  return groups
}

/** Medida padrão no formato brasileiro ("77,8 × 68,1 cm"). */
function sizeOf(def: LibraryDef | FloorDef): string {
  const f = formatCmValue
  if (def.kind === 'floor') return `peça ${f(def.defaults.width)} × ${f(def.defaults.length)} cm`
  if (def.kind === 'opening') return `${f(def.defaults.width)} × ${f(def.defaults.height)} cm`
  if (def.round) return `⌀ ${f(def.defaults.width)} cm`
  return `${f(def.defaults.width)} × ${f(def.defaults.depth)} cm`
}

type AnyDef = LibraryDef | FloorDef

function Card({ def }: { def: AnyDef }) {
  const placing = useEditorStore((s) => s.placing)
  const startPlacing = useEditorStore((s) => s.startPlacing)
  const setTool = useEditorStore((s) => s.setTool)
  const active = placing === def.id
  return (
    <button
      type="button"
      className={`lib-card ${active ? 'active' : ''}`}
      title={`${def.name} — ${def.kind === 'floor' ? 'clique e depois clique no cômodo' : def.kind === 'item' ? 'clique e depois clique na planta' : 'clique e depois clique na parede'}, ou arraste para a planta`}
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
      {def.kind === 'floor' ? <FloorSwatch floor={{ componentId: def.id, ...def.defaults, rotation: 0 }} size={56} /> : <SymbolSvg def={def} size={64} />}
      <span className="lib-name">{def.name}</span>
      <span className="lib-size">
        {sizeOf(def)}
      </span>
    </button>
  )
}

export function LibraryPanel() {
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState<Set<CategoryId>>(new Set())
  const searching = query.trim() !== ''
  const results: AnyDef[] = searching ? [...searchComponents(query), ...searchFloors(query)] : []

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
          const items: AnyDef[] = c.id === 'floors' ? FLOORS : listByCategory(c.id)
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
              {open &&
                groupsOf(items).map((g) => (
                  <div key={g.name || 'todos'}>
                    {g.name && <h3 className="lib-group">{g.name}</h3>}
                    <div className="lib-grid">
                      {g.defs.map((def) => (
                        <Card key={def.id} def={def} />
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          )
        })
      )}
    </section>
  )
}
