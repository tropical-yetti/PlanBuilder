import { WallKindPicker } from '../app/WallKindPicker'
import { useEditorStore } from '../store/editorStore'

/** Opções da ferramenta ativa, sobre a planta. Por enquanto: o tipo das paredes desenhadas. */
export function ToolOptions() {
  const tool = useEditorStore((s) => s.tool)
  const wallKind = useEditorStore((s) => s.wallKind)
  const setWallKind = useEditorStore((s) => s.setWallKind)
  if (tool !== 'wall' && tool !== 'room') return null
  return (
    <div className="tool-options" onPointerDown={(e) => e.stopPropagation()}>
      <span>Desenhar como</span>
      <WallKindPicker value={wallKind} onChange={setWallKind} label="Tipo das paredes desenhadas" />
    </div>
  )
}
