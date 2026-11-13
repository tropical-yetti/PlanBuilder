import { Component, lazy, Suspense, type ReactNode } from 'react'
import { Canvas2D } from '../editor2d/Canvas2D'
import { useEditorStore } from '../store/editorStore'

// A vista 3D (three.js) só é baixada quando o usuário a abre.
const Scene3D = lazy(() => import('../viewer3d/Scene3D'))

/** Se o navegador não conseguir abrir o 3D (sem WebGL, por exemplo), a planta 2D continua funcionando. */
class Scene3DBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) {
      return <p className="placeholder">Não foi possível abrir a vista 3D neste navegador. A planta 2D continua disponível.</p>
    }
    return this.props.children
  }
}

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
          <Scene3DBoundary>
            <Suspense fallback={<p className="placeholder">Carregando a vista 3D…</p>}>
              <Scene3D />
            </Suspense>
          </Scene3DBoundary>
        </div>
      )}
    </main>
  )
}
