import { useState } from 'react'
import { commands } from '../commands/registry'
import { WALL_LIMITS } from '../model/limits'
import { fitOpeningsToWalls } from '../model/openings'
import { quantities } from '../model/quantities'
import { formatArea, formatMeters } from '../model/units'
import { canMergeWalls, connectMovedNodes, defaultThickness, kindOf, setNodePositions, setWallLengthPositions, wallLength, type LengthAnchor } from '../model/walls'
import type { Id, Wall, WallKind } from '../model/types'
import { WallKindPicker } from './WallKindPicker'
import { WALL_KINDS } from './wallKinds'
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
  const newKind = useEditorStore((s) => s.wallKind)
  const setNewKind = useEditorStore((s) => s.setWallKind)

  const walls = selection.map((id) => project.walls[id]).filter((w): w is Wall => !!w)
  const ids: Id[] = walls.map((w) => w.id)

  if (walls.length === 0) {
    const s = project.settings
    const kind = newKind
    const setDefaultThickness = (v: number) =>
      update('Espessura padrão alterada', (d) => {
        if (kind === 'partition') d.settings.partitionThickness = v
        else if (kind === 'panel') d.settings.panelThickness = v
        else d.settings.defaultWallThickness = v
      })
    return (
      <div className="props">
        <h3 className="props-title">Paredes novas</h3>
        <div className="field stacked">
          <span className="field-label">Tipo</span>
          <WallKindPicker value={kind} onChange={setNewKind} />
        </div>
        <NumberField
          label={`Espessura (${WALL_KINDS.find((k) => k.id === kind)!.label.toLowerCase()})`}
          value={defaultThickness(project, kind)}
          {...WALL_LIMITS.thickness}
          onCommit={setDefaultThickness}
        />
        <NumberField
          label="Altura"
          value={s.defaultWallHeight}
          {...WALL_LIMITS.height}
          onCommit={(v) => update('Altura padrão alterada', (d) => void (d.settings.defaultWallHeight = v))}
        />
        <p className="empty">
          {kind === 'panel'
            ? 'Painéis (parede falsa, painel de TV) não formam cômodo: só a área que ocupam é descontada do cômodo em volta.'
            : 'Selecione uma parede para editar suas medidas.'}
        </p>
      </div>
    )
  }

  const single = walls.length === 1 ? walls[0]! : null
  const totalLength = walls.reduce((sum, w) => sum + wallLength(project, w), 0)
  // Superfície das paredes selecionadas: as duas faces, descontando portas e janelas.
  const sides = quantities(project).wallSides
  // Painéis: a área de um lado (é o que se orça em gesso ou marcenaria); paredes: as duas faces.
  const allPanels = walls.every((w) => kindOf(w) === 'panel')
  const surface = walls.reduce((sum, w) => {
    if (kindOf(w) === 'panel') return sum + wallLength(project, w) * w.height
    const s = sides.get(w.id)
    return sum + (s ? s.left.area + s.right.area : 0)
  }, 0)
  const kindName = (w: Wall) => WALL_KINDS.find((k) => k.id === kindOf(w))!.label
  const mergeable = walls.length === 2 && canMergeWalls(project, walls[0]!.id, walls[1]!.id)

  return (
    <div className="props">
      <h3 className="props-title">{single ? (kindOf(single) === 'masonry' ? 'Parede' : kindName(single)) : `${walls.length} paredes`}</h3>

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
                fitOpeningsToWalls(d)
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

      <div className="field stacked">
        <span className="field-label">Tipo</span>
        <WallKindPicker
          value={common(walls, (w) => kindOf(w))}
          onChange={(k: WallKind) =>
            update(ids.length > 1 ? 'Tipo das paredes alterado' : 'Tipo da parede alterado', (d) => {
              for (const id of ids) {
                const w = d.walls[id]!
                if (kindOf(w) === k) continue
                // a espessura acompanha o tipo (ex.: alvenaria de 15 cm vira painel de 4,5 cm)
                w.thickness = defaultThickness(d, k)
                if (k === 'masonry') delete w.kind
                else w.kind = k
              }
            })
          }
        />
      </div>
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

      <div className="field" title={allPanels ? 'Comprimento × altura do painel (um lado)' : 'Área das duas faces, descontando portas e janelas'}>
        <span className="field-label">{allPanels ? 'Área do painel' : 'Superfície'}</span>
        <span className="field-value">{formatArea(surface)}</span>
      </div>

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
