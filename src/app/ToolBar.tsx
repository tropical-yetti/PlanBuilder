import { commands } from '../commands/registry'
import { useEditorStore } from '../store/editorStore'
import { Icon } from '../ui/Icon'
import { TOOLS } from './tools'

export function ToolBar() {
  const active = useEditorStore((s) => s.tool)
  return (
    <aside className="toolbar" aria-label="Ferramentas">
      {TOOLS.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`tool ${active === tool.id ? 'active' : ''}`}
          title={tool.available ? `${tool.label} (${tool.shortcut})` : `${tool.label} — disponível em breve`}
          disabled={!tool.available}
          aria-label={tool.label}
          aria-pressed={active === tool.id}
          onClick={() => commands.execute(`tool.${tool.id}`)}
        >
          <Icon name={tool.id} />
        </button>
      ))}
    </aside>
  )
}
