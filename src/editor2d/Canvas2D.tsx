import { useEffect, useMemo, useRef, useState, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
import { Stage } from 'react-konva'
import { wallPolygons } from '../model/wallGeometry'
import { screenToWorld, useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useInteractionStore } from './interactionStore'
import { GridLayer } from './layers/GridLayer'
import { OverlayLayer } from './layers/OverlayLayer'
import { WallLayer } from './layers/WallLayer'
import { C } from './theme'
import { activeTool, tools } from './tools'
import type { PointerInfo } from './tools/types'
import { fitView } from './view'

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  )
}

export function Canvas2D() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [spaceDown, setSpaceDown] = useState(false)
  const [panning, setPanning] = useState(false)
  const panRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null)

  const project = useProjectStore((s) => s.project)
  const view = useEditorStore((s) => s.view)
  const size = useEditorStore((s) => s.canvasSize)
  const toolId = useEditorStore((s) => s.tool)
  const selection = useEditorStore((s) => s.selection)
  const snap = useInteractionStore((s) => s.snap)
  const draft = useInteractionStore((s) => s.draft)
  const typed = useInteractionStore((s) => s.typed)
  const box = useInteractionStore((s) => s.box)
  const hover = useInteractionStore((s) => s.hover)

  const polygons = useMemo(() => [...wallPolygons(project).values()], [project])
  const selected = useMemo(() => new Set(selection.filter((id) => project.walls[id])), [selection, project.walls])

  // Tamanho do canvas acompanha o contêiner; na primeira medição, enquadra o desenho.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let first = true
    const ro = new ResizeObserver(([entry]) => {
      if (!entry) return
      const { width, height } = entry.contentRect
      const state = useEditorStore.getState()
      state.setCanvasSize({ width, height })
      if (first && width > 0) {
        first = false
        state.setView(fitView(useProjectStore.getState().project, { width, height }))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Teclado: a ferramenta ativa tem prioridade (ex.: digitar a medida, Esc) sobre os atalhos globais.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return
      if (e.code === 'Space') {
        e.preventDefault()
        setSpaceDown(true)
        return
      }
      if (e.ctrlKey || e.metaKey) return
      if (activeTool().onKeyDown?.({ key: e.key, shift: e.shiftKey, alt: e.altKey })) {
        e.preventDefault()
        e.stopImmediatePropagation()
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    const onBlur = () => setSpaceDown(false)
    window.addEventListener('keydown', onKeyDown, { capture: true })
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown, { capture: true })
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  // Roda do mouse: zoom no cursor (listener nativo para poder impedir a rolagem da página).
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const r = el.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015))
      useEditorStore.getState().zoomAt({ x: e.clientX - r.left, y: e.clientY - r.top }, factor)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  function info(e: RPointerEvent | RMouseEvent): PointerInfo {
    const r = containerRef.current!.getBoundingClientRect()
    const screen = { x: e.clientX - r.left, y: e.clientY - r.top }
    return {
      screen,
      world: screenToWorld(useEditorStore.getState().view, screen),
      shift: e.shiftKey,
      alt: e.altKey,
      ctrl: e.ctrlKey || e.metaKey,
      button: e.button,
    }
  }

  function onPointerDown(e: RPointerEvent) {
    containerRef.current?.focus()
    if (e.button === 1 || (e.button === 0 && spaceDown)) {
      const v = useEditorStore.getState().view
      panRef.current = { x: e.clientX, y: e.clientY, vx: v.x, vy: v.y }
      setPanning(true)
      e.currentTarget.setPointerCapture(e.pointerId)
      e.preventDefault()
      return
    }
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    activeTool().onPointerDown?.(info(e))
  }

  function onPointerMove(e: RPointerEvent) {
    const pan = panRef.current
    if (pan) {
      const v = useEditorStore.getState().view
      useEditorStore.getState().setView({ ...v, x: pan.vx + e.clientX - pan.x, y: pan.vy + e.clientY - pan.y })
      return
    }
    activeTool().onPointerMove?.(info(e))
  }

  function onPointerUp(e: RPointerEvent) {
    if (panRef.current) {
      panRef.current = null
      setPanning(false)
      return
    }
    if (e.button !== 0) return
    activeTool().onPointerUp?.(info(e))
  }

  function onPointerLeave() {
    if (!panRef.current) useInteractionStore.getState().set({ cursor: null, hover: null, snap: draft ? snap : null })
  }

  const hoverColor = toolId === 'erase' ? C.wallErase : C.wallHover
  const hoveredWall = hover?.kind === 'wall' ? hover.id : null
  const cursor = panning ? 'grabbing' : spaceDown ? 'grab' : tools[toolId].cursor()

  return (
    <div
      ref={containerRef}
      className="canvas2d"
      tabIndex={-1}
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerLeave}
      onDoubleClick={(e) => activeTool().onDoubleClick?.(info(e))}
      onContextMenu={(e) => e.preventDefault()}
      data-testid="canvas2d"
    >
      {size.width > 0 && (
        <Stage width={size.width} height={size.height} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale} listening={false}>
          <GridLayer view={view} width={size.width} height={size.height} />
          <WallLayer polygons={polygons} selected={selected} hovered={hoveredWall} hoverColor={hoverColor} />
          <OverlayLayer
            project={project}
            polygons={polygons}
            pxPerCm={view.scale}
            selected={selected}
            interaction={{ snap, draft, typed, box, hover }}
            showNodeHandles={toolId === 'select'}
          />
        </Stage>
      )}
    </div>
  )
}
