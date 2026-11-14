import type Konva from 'konva'
import { Layer, Stage } from 'react-konva'
import { AnnotationLayer } from '../editor2d/layers/AnnotationLayer'
import { GridLayer } from '../editor2d/layers/GridLayer'
import { OpeningLayer } from '../editor2d/layers/OpeningLayer'
import { OverlayLayer } from '../editor2d/layers/OverlayLayer'
import { RoomLayer } from '../editor2d/layers/RoomLayer'
import { WallLayer } from '../editor2d/layers/WallLayer'
import { openingShapes } from '../editor2d/openingShapes'
import { C } from '../editor2d/theme'
import { quantities } from '../model/quantities'
import { wallPolygons } from '../model/wallGeometry'
import type { Project } from '../model/types'
import type { ExportLayout, ExportOptions } from './exportLayout'

const NONE = new Set<string>()

/** A planta desenhada com as mesmas camadas do editor, sem seleção, prévias nem alças. */
export function ExportDrawing({ project, layout, options, onStage }: { project: Project; layout: ExportLayout; options: ExportOptions; onStage: (s: Konva.Stage | null) => void }) {
  const k = layout.scale
  const polygons = [...wallPolygons(project).values()]
  const view = { x: layout.x, y: layout.y, scale: k }
  return (
    <Stage ref={onStage} width={layout.width} height={layout.height} x={layout.x} y={layout.y} scaleX={k} scaleY={k} listening={false}>
      <Layer listening={false}>
        {options.grid && <GridLayer view={view} width={layout.width} height={layout.height} />}
        <RoomLayer rooms={quantities(project).rooms} pxPerCm={k} highlighted={null} editing={null} showLabels={options.roomLabels} />
      </Layer>
      <WallLayer polygons={polygons} selected={NONE} hovered={null} hoverColor={C.wallFill} locked={NONE} />
      <Layer listening={false}>
        <OpeningLayer shapes={openingShapes(project, () => C.opening)} pxPerCm={k} gapColor="#ffffff" />
        <AnnotationLayer project={project} pxPerCm={k} selected={NONE} hovered={null} hoverColor={C.annotation} showDimensions showTexts editingText={null} />
      </Layer>
      <OverlayLayer
        project={project}
        polygons={polygons}
        pxPerCm={k}
        selected={NONE}
        interaction={{ snap: null, draft: null, typed: '', box: null, hover: null }}
        showNodeHandles={false}
        showWallLengths={options.wallLengths}
      />
    </Stage>
  )
}
