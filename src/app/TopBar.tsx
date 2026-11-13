import type { ReactNode } from 'react'
import { commands } from '../commands/registry'
import { formatShortcut, isMacPlatform } from '../commands/shortcuts'
import { useEditorStore, type ViewMode } from '../store/editorStore'
import { selectCanRedo, selectCanUndo, useProjectStore } from '../store/projectStore'
import { Icon } from '../ui/Icon'

const isMac = isMacPlatform()

function tooltip(id: string): string {
  const cmd = commands.get(id)
  if (!cmd) return ''
  const s = cmd.shortcuts[0]
  const base = s ? `${cmd.label} (${formatShortcut(s, isMac)})` : cmd.label
  return cmd.description ? `${base} — ${cmd.description}` : base
}

function CommandButton({ id, children, enabled }: { id: string; children: ReactNode; enabled?: boolean }) {
  const isEnabled = enabled ?? commands.isEnabled(id)
  return (
    <button type="button" className="btn" title={tooltip(id)} disabled={!isEnabled} onClick={() => commands.execute(id)}>
      {children}
    </button>
  )
}

const VIEW_MODES: { mode: ViewMode; label: string }[] = [
  { mode: '2d', label: '2D' },
  { mode: 'split', label: 'Dividido' },
  { mode: '3d', label: '3D' },
]

export function TopBar() {
  const name = useProjectStore((s) => s.project.name)
  const canUndo = useProjectStore(selectCanUndo)
  const canRedo = useProjectStore(selectCanRedo)
  const viewMode = useEditorStore((s) => s.viewMode)

  return (
    <header className="topbar">
      <div className="brand">
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={22} height={22} />
        <span>PlanBuilder</span>
      </div>

      <nav className="group" aria-label="Arquivo">
        <CommandButton id="file.new">Novo</CommandButton>
        <CommandButton id="file.open">Abrir</CommandButton>
        <CommandButton id="file.save">Salvar</CommandButton>
        <CommandButton id="file.exportPng">Exportar PNG</CommandButton>
      </nav>

      <div className="group" aria-label="Histórico">
        <CommandButton id="edit.undo" enabled={canUndo}>
          <Icon name="undo" size={18} />
        </CommandButton>
        <CommandButton id="edit.redo" enabled={canRedo}>
          <Icon name="redo" size={18} />
        </CommandButton>
      </div>

      <div className="project-name" title="Nome do projeto">
        {name}
      </div>

      <div className="segmented" role="radiogroup" aria-label="Modo de visualização">
        {VIEW_MODES.map(({ mode, label }) => (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={viewMode === mode}
            className={viewMode === mode ? 'active' : ''}
            onClick={() => commands.execute(`view.${mode}`)}
          >
            {label}
          </button>
        ))}
      </div>
    </header>
  )
}
