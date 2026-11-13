import { Canvas2D } from '../editor2d/Canvas2D'
import { useEditorStore } from '../store/editorStore'

export function Workspace() {
  const viewMode = useEditorStore((s) => s.viewMode)
  return (
    <main className={`workspace mode-${viewMode}`} aria-label="Área de desenho">
      {viewMode !== '3d' && (
        <div className="view view-2d">
          <Canvas2D />
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
