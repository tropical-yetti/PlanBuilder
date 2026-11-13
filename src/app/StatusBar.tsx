import { useEditorStore } from '../store/editorStore'
import { getTool } from './tools'

export function StatusBar() {
  const tool = getTool(useEditorStore((s) => s.tool))
  return (
    <footer className="statusbar">
      <span className="status-tool">{tool.label}</span>
      <span className="status-hint">{tool.hint}</span>
      <span className="status-spacer" />
      <span>zoom 100%</span>
    </footer>
  )
}
