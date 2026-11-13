import { commands } from '../commands/registry'
import { useInteractionStore } from '../editor2d/interactionStore'
import { quantities } from '../model/quantities'
import { formatArea } from '../model/units'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { getTool } from './tools'

export function StatusBar() {
  const tool = getTool(useEditorStore((s) => s.tool))
  const scale = useEditorStore((s) => s.view.scale)
  const cursor = useInteractionStore((s) => s.cursor)
  const typed = useInteractionStore((s) => s.typed)
  const q = quantities(useProjectStore((s) => s.project))
  return (
    <footer className="statusbar">
      <span className="status-tool">{tool.label}</span>
      <span className="status-hint">{typed ? `Medida digitada: ${typed} — Enter confirma, Esc cancela` : tool.hint}</span>
      <span className="status-spacer" />
      {q.totalArea > 0 && (
        <span className="status-areas" title="Área total construída (com paredes) e área útil (soma dos cômodos)">
          Total {formatArea(q.totalArea)} · Útil {formatArea(q.usefulArea)}
        </span>
      )}
      {cursor && (
        <span className="status-coords">
          x {Math.round(cursor.x)} · y {Math.round(cursor.y)} cm
        </span>
      )}
      <button type="button" className="status-zoom" title="Zoom 100% (Shift+0)" onClick={() => commands.execute('view.zoom100')}>
        {Math.round(scale * 100)}%
      </button>
      <button type="button" className="status-zoom" title="Ajustar à tela (Shift+1)" onClick={() => commands.execute('view.fit')}>
        Ajustar
      </button>
    </footer>
  )
}
