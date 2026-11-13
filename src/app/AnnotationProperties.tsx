import { commands } from '../commands/registry'
import { dimensionGeometry } from '../model/annotations'
import { formatMeters } from '../model/units'
import type { Dimension, TextNote } from '../model/types'
import { useProjectStore } from '../store/projectStore'
import { NumberField } from '../ui/NumberField'

function Actions() {
  return (
    <div className="props-actions">
      <button type="button" className="btn outline" onClick={() => commands.execute('edit.duplicate')} title="Duplicar (Ctrl+D)">
        Duplicar
      </button>
      <button type="button" className="btn outline danger" onClick={() => commands.execute('edit.delete')} title="Excluir (Del)">
        Excluir
      </button>
    </div>
  )
}

export function TextProperties({ texts }: { texts: TextNote[] }) {
  const update = useProjectStore((s) => s.update)
  const ids = texts.map((t) => t.id)
  const single = texts.length === 1 ? texts[0]! : null
  const same = <T,>(pick: (t: TextNote) => T): T | null => (texts.every((t) => pick(t) === pick(texts[0]!)) ? pick(texts[0]!) : null)
  return (
    <div className="props">
      <h3 className="props-title">{single ? 'Texto' : `${texts.length} textos`}</h3>
      {single && (
        <label className="field stacked">
          <span className="field-label">Conteúdo</span>
          <textarea
            className="field-textarea"
            rows={2}
            defaultValue={single.text}
            key={single.id + single.text}
            onBlur={(e) => {
              const clean = e.target.value.trim()
              if (clean !== '' && clean !== single.text) update('Texto alterado', (d) => void (d.texts[single.id]!.text = clean))
            }}
          />
        </label>
      )}
      <NumberField
        label="Tamanho"
        value={same((t) => t.size)}
        min={5}
        max={200}
        title="Altura das letras, em centímetros na planta"
        onCommit={(v) =>
          update('Tamanho do texto alterado', (d) => {
            for (const id of ids) d.texts[id]!.size = v
          })
        }
      />
      <NumberField
        label="Rotação"
        value={same((t) => t.rotation)}
        min={0}
        max={359}
        suffix="°"
        onCommit={(v) =>
          update('Rotação do texto alterada', (d) => {
            for (const id of ids) d.texts[id]!.rotation = v
          })
        }
      />
      <Actions />
    </div>
  )
}

export function DimensionProperties({ dimensions }: { dimensions: Dimension[] }) {
  const update = useProjectStore((s) => s.update)
  const single = dimensions.length === 1 ? dimensions[0]! : null
  const ids = dimensions.map((d) => d.id)
  const offsets = dimensions.map((d) => Math.abs(d.offset))
  return (
    <div className="props">
      <h3 className="props-title">{single ? 'Cota' : `${dimensions.length} cotas`}</h3>
      {single && (
        <div className="field">
          <span className="field-label">Medida</span>
          <span className="field-value">{formatMeters(dimensionGeometry(single).length)}</span>
        </div>
      )}
      <NumberField
        label="Afastamento"
        value={offsets.every((o) => o === offsets[0]) ? offsets[0]! : null}
        min={0}
        max={1000}
        title="Distância da linha de cota até os pontos medidos"
        onCommit={(v) =>
          update('Afastamento da cota alterado', (d) => {
            for (const id of ids) d.dimensions[id]!.offset = (d.dimensions[id]!.offset < 0 ? -1 : 1) * v
          })
        }
      />
      <div className="props-actions">
        <button
          type="button"
          className="btn outline"
          onClick={() =>
            update('Lado da cota invertido', (d) => {
              for (const id of ids) d.dimensions[id]!.offset = -d.dimensions[id]!.offset
            })
          }
        >
          Inverter lado
        </button>
      </div>
      <Actions />
    </div>
  )
}
