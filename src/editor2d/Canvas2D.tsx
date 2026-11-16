import { useEffect, useMemo, useRef, useState, type DragEvent as RDragEvent, type MouseEvent as RMouseEvent, type PointerEvent as RPointerEvent } from 'react'
import { Layer, Stage } from 'react-konva'
import { quantities, roomAt } from '../model/quantities'
import { wallPolygons } from '../model/wallGeometry'
import { screenToWorld, useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { useInteractionStore } from './interactionStore'
import { hitTest } from './hitTest'
import { AnnotationLayer } from './layers/AnnotationLayer'
import { GridLayer } from './layers/GridLayer'
import { ItemLayer } from './layers/ItemLayer'
import { OpeningLayer } from './layers/OpeningLayer'
import { openingShapes } from './openingShapes'
import { OverlayLayer } from './layers/OverlayLayer'
import { RoomLayer } from './layers/RoomLayer'
import { RoomNameEditor } from './RoomNameEditor'
import { TextEditor } from './TextEditor'
import { ToolOptions } from './ToolOptions'
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
  const highlightRoom = useInteractionStore((s) => s.highlightRoom)
  const renamingKey = useEditorStore((s) => s.renamingRoom)
  const layers = useEditorStore((s) => s.layers)
  const textEdit = useEditorStore((s) => s.textEdit)
  const rooms = quantities(project).rooms
  const renamingRoom = renamingKey ? rooms.find((r) => r.key === renamingKey) : undefined

  const polygons = useMemo(() => [...wallPolygons(project).values()], [project])
  const selected = useMemo(
    () => new Set(selection.filter((id) => project.walls[id] || project.openings[id] || project.items[id] || project.texts[id] || project.dimensions[id])),
    [selection, project.walls, project.openings, project.items, project.texts, project.dimensions],
  )
  const wallKinds = useMemo(
    () => new Map(Object.values(project.walls).flatMap((w) => (w.kind ? [[w.id, w.kind] as const] : []))),
    [project.walls],
  )
  const lockedWalls = useMemo(() => new Set(Object.values(project.walls).filter((w) => w.locked).map((w) => w.id)), [project.walls])
  const hoveredOpening = hover?.kind === 'opening' ? hover.id : null
  const hoveredItem = hover?.kind === 'item' ? hover.id : null
  const items = useMemo(() => Object.values(project.items), [project.items])
  const itemColor = (id: string) =>
    selected.has(id) ? C.accent : hoveredItem === id ? (toolId === 'erase' ? C.invalid : C.wallHover) : project.items[id]?.locked ? C.locked : C.furniture
  const openings = useMemo(
    () =>
      openingShapes(project, (id) =>
        selected.has(id) ? C.accent : hoveredOpening === id ? (toolId === 'erase' ? C.invalid : C.wallHover) : project.openings[id]?.locked ? C.locked : C.opening,
      ),
    [project, selected, hoveredOpening, toolId],
  )

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
        // Sem vista lembrada da última sessão, enquadra o desenho.
        if (!state.viewRestored) state.setView(fitView(useProjectStore.getState().project, { width, height }))
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Teclado: a ferramenta ativa tem prioridade (ex.: digitar a medida, Esc) sobre os atalhos globais.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || useEditorStore.getState().dialog) return
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

  function info(e: RPointerEvent | RMouseEvent | RDragEvent): PointerInfo {
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

  // Arrastar um componente da biblioteca para a planta: usa a mesma lógica da ferramenta de inserção.
  function onDragOver(e: RDragEvent) {
    if (useEditorStore.getState().tool !== 'place') return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    tools.place.onPointerMove?.(info(e))
  }

  function onDrop(e: RDragEvent) {
    if (useEditorStore.getState().tool !== 'place') return
    e.preventDefault()
    tools.place.onPointerDown?.({ ...info(e), button: 0 })
    useEditorStore.getState().setTool('select')
  }

  // Botão direito: seleciona o objeto sob o cursor (se ainda não estiver) e abre o menu de contexto.
  function onContextMenu(e: RMouseEvent) {
    e.preventDefault()
    const i = info(e)
    const state = useEditorStore.getState()
    const p = useProjectStore.getState().project
    const hit = hitTest(p, i.world, state.view.scale, { nodes: false, includeLocked: true })
    if (hit && !state.selection.includes(hit.id)) state.setSelection([hit.id])
    if (!hit) state.setSelection([])
    state.setContextMenu({ page: { x: e.clientX, y: e.clientY }, world: i.world, id: hit?.id ?? null, roomKey: hit ? null : (roomAt(p, i.world)?.key ?? null) })
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
      onContextMenu={onContextMenu}
      // O foco é controlado à mão (no pointerdown): sem isto, o clique tiraria o foco de um campo recém-aberto sobre a planta.
      onMouseDown={(e) => e.preventDefault()}
      onDragOver={onDragOver}
      onDrop={onDrop}
      data-testid="canvas2d"
    >
      {size.width > 0 && (
        <Stage width={size.width} height={size.height} x={view.x} y={view.y} scaleX={view.scale} scaleY={view.scale} listening={false}>
          {/* Poucas camadas (cada uma é um canvas): fundo, paredes, objetos e sobreposições. */}
          <Layer listening={false}>
          {layers.grid && <GridLayer view={view} width={size.width} height={size.height} />}
          <RoomLayer rooms={rooms} pxPerCm={view.scale} highlighted={highlightRoom} editing={renamingRoom?.key ?? null} showLabels={layers.roomLabels} />
          </Layer>
          <WallLayer polygons={polygons} selected={selected} hovered={hoveredWall} hoverColor={hoverColor} locked={lockedWalls} kinds={wallKinds} />
          <Layer listening={false}>
          {layers.items && <ItemLayer items={items} pxPerCm={view.scale} colorOf={itemColor} />}
          {layers.openings && <OpeningLayer shapes={openings} pxPerCm={view.scale} />}
          <RoomLayer part="labels" rooms={rooms} pxPerCm={view.scale} highlighted={highlightRoom} editing={renamingRoom?.key ?? null} showLabels={layers.roomLabels} />
          <AnnotationLayer
            project={project}
            pxPerCm={view.scale}
            selected={selected}
            hovered={hover?.kind === 'text' || hover?.kind === 'dimension' ? hover.id : null}
            hoverColor={hoverColor}
            showDimensions={layers.dimensions}
            showTexts={layers.texts}
            editingText={textEdit?.id ?? null}
          />
          </Layer>
          <OverlayLayer
            project={project}
            polygons={polygons}
            pxPerCm={view.scale}
            selected={selected}
            interaction={{ snap, draft, typed, box, hover }}
            showNodeHandles={toolId === 'select'}
            showWallLengths={layers.autoDimensions}
          />
        </Stage>
      )}
      <ToolOptions />
      {renamingRoom && <RoomNameEditor key={renamingRoom.key} room={renamingRoom} />}
      {textEdit && <TextEditor key={`${textEdit.id}-${textEdit.at.x}-${textEdit.at.y}`} edit={textEdit} />}
    </div>
  )
}
