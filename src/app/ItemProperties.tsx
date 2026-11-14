import { commands } from '../commands/registry'
import { getItem, itemsInGroup } from '../library/registry'
import type { ItemDef } from '../library/types'
import { normalizeAngle, resizeItem } from '../model/items'
import type { Id, Item } from '../model/types'
import { useProjectStore } from '../store/projectStore'
import { NumberField } from '../ui/NumberField'
import { ParamInput } from './OpeningProperties'

function common<T>(items: Item[], pick: (it: Item) => T): T | null {
  const v = pick(items[0]!)
  return items.every((it) => pick(it) === v) ? v : null
}

/**
 * Propriedades de móveis. Os campos vêm da definição do componente (limites, tamanhos padrão,
 * parâmetros próprios), então um móvel novo na biblioteca já ganha este painel.
 */
export function ItemProperties({ items }: { items: Item[] }) {
  const update = useProjectStore((s) => s.update)
  const ids: Id[] = items.map((it) => it.id)
  const single = items.length === 1 ? items[0]! : null
  const defs = items.map((it) => getItem(it.componentId))
  const def: ItemDef = defs[0]!
  const sameDef = defs.every((d) => d.id === def.id)
  const lim = (pick: (d: ItemDef) => [number, number]) => {
    const ranges = defs.map(pick)
    return { min: Math.max(...ranges.map((r) => r[0])), max: Math.min(...ranges.map((r) => r[1])) }
  }
  const widthLim = lim((d) => [d.limits.minWidth, d.limits.maxWidth])
  const depthLim = lim((d) => [d.limits.minDepth, d.limits.maxDepth])
  const heightLim = lim((d) => [d.limits.minHeight, d.limits.maxHeight])
  const round = sameDef && !!def.round
  const width = common(items, (it) => it.width)
  const depth = common(items, (it) => it.depth)

  const set = (label: string, fn: (it: Item) => void) =>
    update(label, (d) => {
      for (const id of ids) fn(d.items[id]!)
    })

  return (
    <div className="props">
      <h3 className="props-title">
        {single || sameDef ? def.name : 'Móveis'}
        {items.length > 1 ? ` (${items.length})` : ''}
      </h3>

      {single && itemsInGroup(def.group).length > 1 && (
        <label className="field">
          <span className="field-label">Tipo</span>
          <select
            className="field-select"
            value={def.id}
            onChange={(e) => {
              const next = getItem(e.target.value)
              set('Tipo alterado', (it) => {
                it.componentId = next.id
                resizeItem(it, { width: next.defaults.width, depth: next.defaults.depth }, next.againstWall)
                it.height = next.defaults.height
                it.params = { ...next.defaults.params }
              })
            }}
          >
            {itemsInGroup(def.group).map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
                {d.group === 'Camas' ? ` (${d.defaults.width} × ${d.defaults.depth})` : ''}
              </option>
            ))}
          </select>
        </label>
      )}

      {round ? (
        <NumberField
          label="Diâmetro"
          value={width}
          min={widthLim.min}
          max={widthLim.max}
          onCommit={(v) =>
            set('Diâmetro alterado', (it) => resizeItem(it, { width: v, depth: v }, def.againstWall))
          }
        />
      ) : (
        <>
          <NumberField label="Largura" value={width} min={widthLim.min} max={widthLim.max} onCommit={(v) => set('Largura alterada', (it) => void (it.width = v))} />
          <NumberField
            label="Profundidade"
            value={depth}
            min={depthLim.min}
            max={depthLim.max}
            title="Da frente ao fundo"
            onCommit={(v) => set('Profundidade alterada', (it) => resizeItem(it, { depth: v }, getItem(it.componentId).againstWall))}
          />
        </>
      )}
      {sameDef && def.presets && (
        <div className="preset-list" role="group" aria-label="Tamanhos padrão">
          {def.presets.map((pr) => {
            const active = width === pr.width && depth === pr.depth
            return (
              <button
                key={pr.label}
                type="button"
                className={`chip ${active ? 'active' : ''}`}
                onClick={() =>
                  set('Tamanho alterado', (it) => resizeItem(it, { width: pr.width, depth: pr.depth }, def.againstWall))
                }
              >
                {pr.label}
              </button>
            )
          })}
        </div>
      )}
      <NumberField
        label="Altura"
        value={common(items, (it) => it.height)}
        min={heightLim.min}
        max={heightLim.max}
        title={def.group === 'Camas' ? 'Altura da cabeceira' : undefined}
        onCommit={(v) => set('Altura alterada', (it) => void (it.height = v))}
      />
      <NumberField
        label="Rotação"
        value={common(items, (it) => it.rotation)}
        min={0}
        max={359.9}
        suffix="°"
        title="Giro no sentido horário; R gira 90°"
        onCommit={(v) => set('Rotação alterada', (it) => void (it.rotation = normalizeAngle(v)))}
      />

      {sameDef &&
        def.paramsSchema?.map((field) => (
          <ParamInput
            key={field.key}
            field={field}
            value={common(items, (it) => (field.key in it.params ? it.params[field.key] : def.defaults.params[field.key]) as unknown)}
            onChange={(v) => set(`${field.label} alterado`, (it) => void (it.params[field.key] = v))}
          />
        ))}

      <div className="props-actions">
        <button type="button" className="btn outline" onClick={() => commands.execute('edit.rotateCw')} title="Girar 90° (R)">
          Girar 90°
        </button>
        <button type="button" className="btn outline" onClick={() => commands.execute('edit.mirrorH')} title="Espelhar (Shift+H)">
          Espelhar
        </button>
        <button type="button" className="btn outline" onClick={() => commands.execute('edit.duplicate')} title="Duplicar (Ctrl+D)">
          Duplicar
        </button>
        <button type="button" className="btn outline danger" onClick={() => commands.execute('edit.delete')} title="Excluir (Del)">
          Excluir
        </button>
      </div>
    </div>
  )
}
