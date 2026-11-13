import { useEditorStore } from '../store/editorStore'

export function Workspace() {
  const viewMode = useEditorStore((s) => s.viewMode)
  return (
    <main className={`workspace mode-${viewMode}`} aria-label="Área de desenho">
      {viewMode !== '3d' && (
        <div className="view view-2d">
          <p className="placeholder">Editor 2D — chega na fase 1</p>
        </div>
      )}
      {viewMode !== '2d' && (
        <div className="view view-3d">
          <p className="placeholder">Vista 3D — chega na fase 6</p>
        </div>
      )}
    </main>
  )
}
