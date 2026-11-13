import { commands } from '../commands/registry'
import type { Opening } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { OpeningProperties } from './OpeningProperties'
import { WallProperties } from './WallProperties'

/** Mostra o painel adequado ao que está selecionado. */
export function PropertiesPanel() {
  const project = useProjectStore((s) => s.project)
  const selection = useEditorStore((s) => s.selection)
  const openings = selection.map((id) => project.openings[id]).filter((o): o is Opening => !!o)
  const walls = selection.filter((id) => !!project.walls[id]).length

  if (openings.length > 0 && walls === 0) return <OpeningProperties openings={openings} />
  if (openings.length > 0 && walls > 0) {
    return (
      <div className="props">
        <h3 className="props-title">{openings.length + walls} objetos</h3>
        <p className="empty">
          {walls} {walls === 1 ? 'parede' : 'paredes'} e {openings.length} {openings.length === 1 ? 'abertura' : 'aberturas'}. Selecione objetos do mesmo
          tipo para editar as medidas.
        </p>
        <div className="props-actions">
          <button type="button" className="btn outline danger" onClick={() => commands.execute('edit.delete')} title="Excluir (Del)">
            Excluir
          </button>
        </div>
      </div>
    )
  }
  return <WallProperties />
}
