import { commands } from '../commands/registry'
import { classify } from '../model/selection'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { DimensionProperties, TextProperties } from './AnnotationProperties'
import { OpeningProperties } from './OpeningProperties'
import { WallProperties } from './WallProperties'

/** Mostra o painel adequado ao que está selecionado. */
export function PropertiesPanel() {
  const project = useProjectStore((s) => s.project)
  const selection = useEditorStore((s) => s.selection)
  const c = classify(project, selection)
  const kinds = [c.walls, c.openings, c.texts, c.dimensions].filter((list) => list.length > 0).length

  if (kinds <= 1) {
    if (c.openings.length > 0) return <OpeningProperties openings={c.openings} />
    if (c.texts.length > 0) return <TextProperties texts={c.texts} />
    if (c.dimensions.length > 0) return <DimensionProperties dimensions={c.dimensions} />
    return <WallProperties />
  }

  const parts = [
    [c.walls.length, 'parede', 'paredes'],
    [c.openings.length, 'abertura', 'aberturas'],
    [c.texts.length, 'texto', 'textos'],
    [c.dimensions.length, 'cota', 'cotas'],
  ] as const
  return (
    <div className="props">
      <h3 className="props-title">{c.count} objetos</h3>
      <p className="empty">
        {parts
          .filter(([n]) => n > 0)
          .map(([n, one, many]) => `${n} ${n === 1 ? one : many}`)
          .join(', ')}
        . Arraste para mover tudo junto, ou use o botão direito para girar, espelhar, alinhar e duplicar.
      </p>
      <div className="props-actions">
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
