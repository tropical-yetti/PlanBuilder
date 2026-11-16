import { commands } from '../commands/registry'
import { quantities } from '../model/quantities'
import { classify } from '../model/selection'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { DimensionProperties, TextProperties } from './AnnotationProperties'
import { ItemProperties } from './ItemProperties'
import { OpeningProperties } from './OpeningProperties'
import { RoomProperties } from './RoomProperties'
import { WallProperties } from './WallProperties'

/** Mostra o painel adequado ao que está selecionado. */
export function PropertiesPanel() {
  const project = useProjectStore((s) => s.project)
  const selection = useEditorStore((s) => s.selection)
  const roomKey = useEditorStore((s) => s.selectedRoom)
  // A chave some se as paredes do cômodo mudarem: aí o painel volta ao normal.
  const room = roomKey ? quantities(project).rooms.find((r) => r.key === roomKey) : undefined
  const c = classify(project, selection)
  if (c.count === 0 && room) return <RoomProperties key={room.key} room={room} />
  const kinds = [c.walls, c.openings, c.items, c.texts, c.dimensions].filter((list) => list.length > 0).length

  if (kinds <= 1) {
    if (c.openings.length > 0) return <OpeningProperties openings={c.openings} />
    if (c.items.length > 0) return <ItemProperties items={c.items} />
    if (c.texts.length > 0) return <TextProperties texts={c.texts} />
    if (c.dimensions.length > 0) return <DimensionProperties dimensions={c.dimensions} />
    return <WallProperties />
  }

  const parts = [
    [c.walls.length, 'parede', 'paredes'],
    [c.openings.length, 'abertura', 'aberturas'],
    [c.items.length, 'móvel', 'móveis'],
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
