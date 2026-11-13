import { commands } from '../commands/registry'
import { getComponent, listByCategory } from '../library/registry'
import type { ComponentDef, ParamField } from '../library/types'
import { commonWall, distancesToEnds, isOpeningValid, moveOpening, openingsOnWall, resizeOpening } from '../model/openings'
import type { Id, Opening } from '../model/types'
import { useProjectStore } from '../store/projectStore'
import { NumberField } from '../ui/NumberField'

function common<T>(items: Opening[], pick: (o: Opening) => T): T | null {
  const v = pick(items[0]!)
  return items.every((o) => pick(o) === v) ? v : null
}

function ParamInput({ field, value, onChange }: { field: ParamField; value: unknown; onChange: (v: unknown) => void }) {
  if (field.type === 'select') {
    return (
      <label className="field">
        <span className="field-label">{field.label}</span>
        <select
          className="field-select"
          value={String(value ?? '')}
          onChange={(e) => onChange(field.options.find((o) => String(o.value) === e.target.value)?.value)}
        >
          {field.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    )
  }
  if (field.type === 'boolean') {
    return (
      <label className="field">
        <span className="field-label">{field.label}</span>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      </label>
    )
  }
  return (
    <NumberField
      label={field.label}
      value={typeof value === 'number' ? value : null}
      min={field.min}
      max={field.max}
      suffix={field.suffix ?? ''}
      onCommit={onChange}
    />
  )
}

/**
 * Propriedades de portas e janelas. Os campos vêm da definição do componente na biblioteca
 * (limites, larguras comuns, peitoril, parâmetros próprios), então um componente novo já ganha este painel.
 */
export function OpeningProperties({ openings }: { openings: Opening[] }) {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.update)
  const ids: Id[] = openings.map((o) => o.id)
  const single = openings.length === 1 ? openings[0]! : null
  const defs = openings.map((o) => getComponent(o.componentId))
  const def: ComponentDef = defs[0]!
  const sameDef = defs.every((d) => d.id === def.id)
  const limits = {
    minWidth: Math.max(...defs.map((d) => d.limits.minWidth)),
    maxWidth: Math.min(...defs.map((d) => d.limits.maxWidth)),
    minHeight: Math.max(...defs.map((d) => d.limits.minHeight)),
    maxHeight: Math.min(...defs.map((d) => d.limits.maxHeight)),
  }
  const width = common(openings, (o) => o.width)
  const fits = (w: number) => openings.every((o) => isOpeningValid(project, o.wallId, o.offset, w, o.id))
  const setWidth = (w: number) =>
    update('Largura alterada', (d) => {
      for (const id of ids) resizeOpening(d, id, w)
    })

  const wallId = commonWall(project, ids)
  const canDistribute = !!wallId && openingsOnWall(project, wallId).length >= 2
  const dists = single ? distancesToEnds(project, single) : null
  const total = single && dists ? dists.start + single.width + dists.end : 0

  return (
    <div className="props">
      <h3 className="props-title">{single || sameDef ? def.name : 'Portas e janelas'}{openings.length > 1 ? ` (${openings.length})` : ''}</h3>

      {single && (
        <label className="field">
          <span className="field-label">Tipo</span>
          <select
            className="field-select"
            value={def.id}
            onChange={(e) => {
              const next = getComponent(e.target.value)
              update('Tipo alterado', (d) => {
                const o = d.openings[single.id]!
                o.componentId = next.id
                o.params = { ...next.defaults.params }
                // Trocar porta por janela (ou o contrário) ajusta altura e peitoril ao novo tipo.
                if (next.hasSill !== def.hasSill) {
                  o.height = next.defaults.height
                  o.sillHeight = next.defaults.sillHeight
                }
              })
            }}
          >
            {(['doors', 'windows'] as const).map((cat) => (
              <optgroup key={cat} label={cat === 'doors' ? 'Portas' : 'Janelas'}>
                {listByCategory(cat).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      <NumberField
        label="Largura"
        value={width}
        min={limits.minWidth}
        max={limits.maxWidth}
        validate={fits}
        title={`De ${limits.minWidth} a ${limits.maxWidth} cm, se couber na parede`}
        onCommit={setWidth}
      />
      {sameDef && def.presets && (
        <div className="chips" role="group" aria-label="Larguras comuns">
          {def.presets.map((w) => (
            <button key={w} type="button" className={`chip ${width === w ? 'active' : ''}`} disabled={width !== w && !fits(w)} onClick={() => setWidth(w)}>
              {w}
            </button>
          ))}
        </div>
      )}
      <NumberField
        label="Altura"
        value={common(openings, (o) => o.height)}
        min={limits.minHeight}
        max={limits.maxHeight}
        onCommit={(v) =>
          update('Altura alterada', (d) => {
            for (const id of ids) d.openings[id]!.height = v
          })
        }
      />
      {defs.every((d) => d.hasSill) && (
        <NumberField
          label="Peitoril"
          value={common(openings, (o) => o.sillHeight)}
          min={0}
          max={250}
          title="Altura do chão até a base da janela"
          onCommit={(v) =>
            update('Peitoril alterado', (d) => {
              for (const id of ids) d.openings[id]!.sillHeight = v
            })
          }
        />
      )}

      {sameDef &&
        def.paramsSchema?.map((field) => (
          <ParamInput
            key={field.key}
            field={field}
            value={common(openings, (o) => o.params[field.key] as unknown)}
            onChange={(v) =>
              update(`${field.label} alterado`, (d) => {
                for (const id of ids) d.openings[id]!.params[field.key] = v
              })
            }
          />
        ))}

      {single && dists && (
        <>
          <h4 className="props-subtitle">Posição na parede</h4>
          <NumberField
            label="Até o início"
            value={Math.round(dists.start * 10) / 10}
            min={0}
            max={total}
            validate={(v) => isOpeningValid(project, single.wallId, v + single.width / 2, single.width, single.id)}
            onCommit={(v) => update('Abertura movida', (d) => void moveOpening(d, single.id, single.wallId, v + single.width / 2))}
          />
          <NumberField
            label="Até o fim"
            value={Math.round(dists.end * 10) / 10}
            min={0}
            max={total}
            validate={(v) => isOpeningValid(project, single.wallId, total - v - single.width / 2, single.width, single.id)}
            onCommit={(v) => update('Abertura movida', (d) => void moveOpening(d, single.id, single.wallId, total - v - single.width / 2))}
          />
        </>
      )}

      <div className="props-actions">
        {defs.some((d) => d.sided) && (
          <button type="button" className="btn outline" onClick={() => commands.execute('opening.flipSide')} title="Inverter lado de abertura (F)">
            Inverter lado
          </button>
        )}
        {defs.some((d) => d.hinged) && (
          <button type="button" className="btn outline" onClick={() => commands.execute('opening.flipHinge')} title="Inverter dobradiça (Shift+F)">
            Inverter dobradiça
          </button>
        )}
        {single && (
          <button type="button" className="btn outline" onClick={() => commands.execute('opening.center')} title="Centraliza na parede">
            Centralizar
          </button>
        )}
        {canDistribute && (
          <button
            type="button"
            className="btn outline"
            onClick={() => commands.execute('opening.distribute')}
            title="Deixa espaços iguais entre todas as aberturas desta parede"
          >
            Distribuir na parede
          </button>
        )}
        <button type="button" className="btn outline danger" onClick={() => commands.execute('edit.delete')} title="Excluir (Del)">
          Excluir
        </button>
      </div>
    </div>
  )
}
