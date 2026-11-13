import { useState } from 'react'
import { commands } from '../commands/registry'
import { WALL_LIMITS } from '../model/limits'
import { formatMeters } from '../model/units'
import { canMergeWalls, connectMovedNodes, setNodePositions, setWallLengthPositions, wallLength, type LengthAnchor } from '../model/walls'
import type { Id, Wall } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { NumberField } from '../ui/NumberField'

const ANCHORS: { id: LengthAnchor; label: string; title: string }[] = [
  { id: 'start', label: 'Início', title: 'Mantém fixa a ponta inicial' },
  { id: 'center', label: 'Centro', title: 'Estica ou encolhe para os dois lados' },
  { id: 'end', label: 'Fim', title: 'Mantém fixa a ponta final' },
]

function common<T>(walls: Wall[], pick: (w: Wall) => T): T | null {
  const first = walls[0]
  if (!first) return null
  const v = pick(first)
  return walls.every((w) => pick(w) === v) ? v : null
}

export function WallProperties() {
  const project = useProjectStore((s) => s.project)
  const update = useProjectStore((s) => s.update)
  const selection = useEditorStore((s) => s.selection)
  const [anchor, setAnchor] = useState<LengthAnchor>('start')

  const walls = selection.map((id) => project.walls[id]).filter((w): w is Wall => !!w)
  const ids: Id[] = walls.map((w) => w.id)

  if (walls.length === 0) {
    const s = project.settings
    return (
      <div className="props">
        <h3 className="props-title">Paredes novas</h3>
        <NumberField
          label="Espessura"
          value={s.defaultWallThickness}
          {...WALL_LIMITS.thickness}
          onCommit={(v) => update('Espessura padrão alterada', (d) => void (d.settings.defaultWallThickness = v))}
        />
        <NumberField
          label="Altura"
          value={s.defaultWallHeight}
          {...WALL_LIMITS.height}
          onCommit={(v) => update('Altura padrão alterada', (d) => void (d.settings.defaultWallHeight = v))}
        />
        <p className="empty">Selecione uma parede para editar suas medidas.</p>
      </div>
    )
  }

  const single = walls.length === 1 ? walls[0]! : null
  const totalLength = walls.reduce((sum, w) => sum + wallLength(project, w), 0)
  const mergeable = walls.length === 2 && canMergeWalls(project, walls[0]!.id, walls[1]!.id)

  return (
    <div className="props">
      <h3 className="props-title">{single ? 'Parede' : `${walls.length} paredes`}</h3>

      {single ? (
        <>
          <NumberField
            label="Comprimento"
            value={Math.round(wallLength(project, single) * 10) / 10}
            {...WALL_LIMITS.length}
            onCommit={(v) =>
              update('Comprimento alterado', (d) => {
                setNodePositions(d, setWallLengthPositions(d, single.id, v, anchor))
                connectMovedNodes(d, [single.a, single.b])
              })
            }
          />
          <div className="field">
            <span className="field-label">Manter fixo</span>
            <div className="segmented small" role="radiogroup" aria-label="Ponta fixa ao mudar o comprimento">
              {ANCHORS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  role="radio"
                  aria-checked={anchor === a.id}
                  className={anchor === a.id ? 'active' : ''}
                  title={a.title}
                  onClick={() => setAnchor(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="field">
          <span className="field-label">Comprimento total</span>
          <span className="field-value">{formatMeters(totalLength)}</span>
        </div>
      )}

      <NumberField
        label="Espessura"
        value={common(walls, (w) => w.thickness)}
        {...WALL_LIMITS.thickness}
        onCommit={(v) =>
          update(ids.length > 1 ? 'Espessura das paredes alterada' : 'Espessura alterada', (d) => {
            for (const id of ids) d.walls[id]!.thickness = v
          })
        }
      />
      <NumberField
        label="Altura"
        value={common(walls, (w) => w.height)}
        {...WALL_LIMITS.height}
        onCommit={(v) =>
          update(ids.length > 1 ? 'Altura das paredes alterada' : 'Altura alterada', (d) => {
            for (const id of ids) d.walls[id]!.height = v
          })
        }
      />

      <div className="props-actions">
        {single && (
          <button type="button" className="btn outline" onClick={() => commands.execute('wall.split')} title="Divide a parede em duas, no meio">
            Dividir ao meio
          </button>
        )}
        {walls.length === 2 && (
          <button
            type="button"
            className="btn outline"
            disabled={!mergeable}
            onClick={() => commands.execute('wall.merge')}
            title={mergeable ? 'Une as duas paredes em uma só' : 'Só é possível unir duas paredes alinhadas e ligadas por um canto'}
          >
            Unir paredes
          </button>
        )}
        <button type="button" className="btn outline danger" onClick={() => commands.execute('edit.delete')} title="Excluir (Del)">
          Excluir
        </button>
      </div>
    </div>
  )
}
