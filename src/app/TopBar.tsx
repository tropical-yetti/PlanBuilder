import { useState, type ReactNode } from 'react'
import { commands } from '../commands/registry'
import { formatShortcut, isMacPlatform } from '../commands/shortcuts'
import { hasContent } from '../persistence/projectFile'
import { APP_VERSION } from '../version'
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

/** Nome do projeto (editável) e onde ele está salvo. */
function ProjectTitle() {
  const name = useProjectStore((s) => s.project.name)
  const revision = useProjectStore((s) => s.revision)
  const content = useProjectStore((s) => hasContent(s.project))
  const file = useEditorStore((s) => s.file)
  const [text, setText] = useState<string | null>(null)

  function commit() {
    const clean = (text ?? '').trim()
    if (text !== null && clean !== '' && clean !== name) useProjectStore.getState().update('Projeto renomeado', (d) => void (d.name = clean))
    setText(null)
  }

  let status = ''
  let hint = ''
  if (file.name === null) {
    if (content) {
      status = 'Salvo só neste navegador'
      hint = 'O projeto é guardado automaticamente neste navegador. Use "Salvar" para ter um arquivo no computador.'
    }
  } else if (revision !== file.savedRevision) {
    status = 'Alterações não salvas no arquivo'
    hint = `Há mudanças depois do último salvamento em "${file.name}". Use "Salvar" (Ctrl+S).`
  } else {
    status = 'Salvo em arquivo'
    hint = `Salvo em "${file.name}".`
  }

  return (
    <div className="project-title">
      <input
        className="project-name"
        value={text ?? name}
        aria-label="Nome do projeto"
        title="Clique para renomear o projeto"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onFocus={(e) => e.target.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
          else if (e.key === 'Escape') {
            setText(null)
            e.currentTarget.blur()
          }
        }}
      />
      {status && (
        <span className={`file-status ${file.name !== null && revision !== file.savedRevision ? 'dirty' : ''}`} title={hint}>
          {status}
        </span>
      )}
    </div>
  )
}

export function TopBar() {
  const canExport = useProjectStore((s) => hasContent(s.project))
  const canUndo = useProjectStore(selectCanUndo)
  const canRedo = useProjectStore(selectCanRedo)
  const viewMode = useEditorStore((s) => s.viewMode)

  return (
    <header className="topbar">
      <div className="brand" title={`PlanBuilder ${APP_VERSION}`}>
        <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={22} height={22} />
        <span>PlanBuilder</span>
        <span className="app-version">{APP_VERSION}</span>
      </div>

      <nav className="group" aria-label="Arquivo">
        <CommandButton id="file.new">Novo</CommandButton>
        <CommandButton id="file.open">Abrir</CommandButton>
        <CommandButton id="file.save">Salvar</CommandButton>
        <CommandButton id="file.exportPng" enabled={canExport}>
          Exportar PNG
        </CommandButton>
      </nav>

      <div className="group" aria-label="Histórico">
        <CommandButton id="edit.undo" enabled={canUndo}>
          <Icon name="undo" size={18} />
        </CommandButton>
        <CommandButton id="edit.redo" enabled={canRedo}>
          <Icon name="redo" size={18} />
        </CommandButton>
      </div>

      <ProjectTitle />

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
