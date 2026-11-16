import { Circle, Group, Label, Layer, Line, Rect, Tag, Text } from 'react-konva'
import { add, angleOf, dist, midpoint, normalize, perp, scale, sub } from '../../model/geometry'
import { getItem } from '../../library/registry'
import { distancesToEnds } from '../../model/openings'
import { formatCm, formatMeters } from '../../model/units'
import { defaultThickness, wallEnds } from '../../model/walls'
import { useEditorStore } from '../../store/editorStore'
import type { WallPolygon } from '../../model/wallGeometry'
import type { Id, Point, Project } from '../../model/types'
import type { InteractionState } from '../interactionStore'
import type { SnapResult } from '../snapping'
import { C } from '../theme'
import { DimensionGlyph } from './AnnotationLayer'
import { ItemGlyph } from './ItemLayer'
import { OpeningGlyph } from './OpeningLayer'

interface Props {
  project: Project
  polygons: WallPolygon[]
  pxPerCm: number
  selected: Set<Id>
  interaction: Pick<InteractionState, 'snap' | 'draft' | 'typed' | 'box' | 'hover'>
  showNodeHandles: boolean
  showWallLengths: boolean
}

/** Texto com tamanho fixo em pixels, posicionado no mundo. */
function ScreenLabel({
  at,
  text,
  k,
  angle = 0,
  pill = false,
  color = C.label,
  size = 11,
}: {
  at: Point
  text: string
  k: number
  angle?: number
  pill?: boolean
  color?: string
  size?: number
}) {
  return (
    <Label x={at.x} y={at.y} scaleX={1 / k} scaleY={1 / k} rotation={angle}>
      <Tag fill={pill ? C.accent : C.labelBg} cornerRadius={pill ? 4 : 3} />
      <Text
        text={text}
        fontSize={size}
        fontFamily="system-ui, sans-serif"
        fill={pill ? '#fff' : color}
        padding={pill ? 4 : 2}
        offsetX={0}
        ref={(node) => {
          // Centraliza o rótulo no ponto (o tamanho do texto só é conhecido depois de medido).
          if (node) {
            const parent = node.getParent()
            parent?.offsetX(node.width() / 2)
            parent?.offsetY(node.height() / 2)
          }
        }}
      />
    </Label>
  )
}

/** Ângulo em graus para o texto ficar legível (nunca de cabeça para baixo). */
function readableAngle(a: Point, b: Point): number {
  let deg = (angleOf(sub(b, a)) * 180) / Math.PI
  if (deg > 90) deg -= 180
  if (deg <= -90) deg += 180
  return deg
}

/** Lado da parede onde fica a cota: "para cima" na tela (ou para a esquerda, em paredes verticais). */
function labelSide(a: Point, b: Point): Point {
  const n = perp(normalize(sub(b, a)))
  return n.y < -1e-9 || (Math.abs(n.y) < 1e-9 && n.x < 0) ? n : scale(n, -1)
}

function SnapMarker({ snap, k }: { snap: SnapResult; k: number }) {
  const r = 5 / k
  const { x, y } = snap.point
  const common = { stroke: C.snap, strokeWidth: 2, strokeScaleEnabled: false }
  return (
    <Group>
      {snap.guides.map((g, i) => (
        <Line key={i} points={[g.a.x, g.a.y, g.b.x, g.b.y]} stroke={C.guide} strokeWidth={1} strokeScaleEnabled={false} dash={[4 / k, 4 / k]} />
      ))}
      {snap.kind === 'node' && <Circle x={x} y={y} radius={r * 1.3} {...common} />}
      {snap.kind === 'midpoint' && <Line points={[x, y - r * 1.4, x + r * 1.3, y + r, x - r * 1.3, y + r]} closed {...common} />}
      {snap.kind === 'wall' && <Rect x={x - r} y={y - r} width={2 * r} height={2 * r} {...common} />}
      {(snap.kind === 'align' || snap.kind === 'angle' || snap.kind === 'grid' || snap.kind === 'none') && (
        <Group>
          <Line points={[x - r, y, x + r, y]} {...common} strokeWidth={1.5} />
          <Line points={[x, y - r, x, y + r]} {...common} strokeWidth={1.5} />
        </Group>
      )}
    </Group>
  )
}

function DraftWall({ a, b, thickness, k, typed }: { a: Point; b: Point; thickness: number; k: number; typed: string }) {
  const length = dist(a, b)
  const n = scale(perp(normalize(sub(b, a))), thickness / 2)
  const pts = [add(a, n), add(b, n), sub(b, n), sub(a, n)]
  const side = labelSide(a, b)
  const labelAt = add(midpoint(a, b), scale(side, thickness / 2 + 16 / k))
  return (
    <Group>
      {length > 0.5 && (
        <Line points={pts.flatMap((p) => [p.x, p.y])} closed fill={C.draftFill} stroke={C.draftStroke} strokeWidth={1} strokeScaleEnabled={false} />
      )}
      <ScreenLabel at={labelAt} k={k} pill text={typed ? `${typed} ▌` : formatMeters(length)} />
    </Group>
  )
}

function DraftRoom({ a, b, thickness, k, typed }: { a: Point; b: Point; thickness: number; k: number; typed: string }) {
  const corners = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
  const w = Math.abs(b.x - a.x)
  const h = Math.abs(b.y - a.y)
  return (
    <Group>
      <Rect
        x={Math.min(a.x, b.x) - thickness / 2}
        y={Math.min(a.y, b.y) - thickness / 2}
        width={w + thickness}
        height={h + thickness}
        stroke={C.draftStroke}
        strokeWidth={1}
        strokeScaleEnabled={false}
        fill={C.draftFill}
      />
      <Rect
        x={Math.min(a.x, b.x) + thickness / 2}
        y={Math.min(a.y, b.y) + thickness / 2}
        width={Math.max(0, w - thickness)}
        height={Math.max(0, h - thickness)}
        fill="#fbfbfc"
        stroke={C.draftStroke}
        strokeWidth={1}
        strokeScaleEnabled={false}
      />
      <Line points={corners.flatMap((p) => [p.x, p.y])} closed stroke={C.draftStroke} strokeWidth={1} strokeScaleEnabled={false} dash={[3 / k, 3 / k]} />
      <ScreenLabel
        at={midpoint(a, b)}
        k={k}
        pill
        text={typed ? `${typed} ▌` : `${formatMeters(w)} × ${formatMeters(h)}`}
      />
    </Group>
  )
}

/**
 * Distâncias da abertura até as duas pontas da parede, mostradas ao inserir, mover ou selecionar.
 * Ficam do lado oposto ao que a porta abre, para não cobrir o símbolo.
 */
function EndDistances({
  project,
  o,
  k,
  color,
}: {
  project: Project
  o: { wallId: Id; offset: number; width: number; flipSide: boolean }
  k: number
  color: string
}) {
  const w = project.walls[o.wallId]
  if (!w) return null
  const [a, b] = wallEnds(project, w)
  const dir = normalize(sub(b, a))
  const side = scale(perp(dir), (o.flipSide ? 1 : -1) * (w.thickness / 2 + 12 / k))
  const d = distancesToEnds(project, o)
  const spans: [number, number][] = [
    [0, d.start],
    [o.offset + o.width / 2, d.end],
  ]
  return (
    <Group>
      {spans.map(([from, length], i) => {
        if (length * k < 26) return null
        const p0 = add(add(a, scale(dir, from)), side)
        const p1 = add(p0, scale(dir, length))
        return (
          <Group key={i}>
            <Line points={[p0.x, p0.y, p1.x, p1.y]} stroke={color} strokeWidth={1} strokeScaleEnabled={false} />
            <ScreenLabel at={midpoint(p0, p1)} k={k} angle={readableAngle(a, b)} text={formatCm(length)} color={color} />
          </Group>
        )
      })}
    </Group>
  )
}

export function OverlayLayer({ project, polygons, pxPerCm: k, selected, interaction, showNodeHandles, showWallLengths }: Props) {
  const { snap, draft, typed, box, hover } = interaction
  // a prévia do desenho usa a espessura do tipo de parede escolhido
  const thickness = defaultThickness(project, useEditorStore((s) => s.wallKind))

  // Nós com alça: os das paredes selecionadas e o nó sob o cursor.
  const handleNodes = new Set<Id>()
  if (showNodeHandles) {
    for (const id of selected) {
      const w = project.walls[id]
      if (w) {
        handleNodes.add(w.a)
        handleNodes.add(w.b)
      }
    }
    if (hover?.kind === 'node') handleNodes.add(hover.id)
  }

  return (
    <Layer listening={false}>
      {/* Cotas automáticas: comprimento de cada parede pelo eixo */}
      {polygons.map((w) => {
        const length = dist(w.a, w.b)
        // Com a camada oculta, só as paredes selecionadas mostram a medida.
        if (length * k < 48 || (!showWallLengths && !selected.has(w.wallId))) return null
        const thick = project.walls[w.wallId]?.thickness ?? thickness
        const at = add(midpoint(w.a, w.b), scale(labelSide(w.a, w.b), thick / 2 + 10 / k))
        return (
          <ScreenLabel
            key={w.wallId}
            at={at}
            k={k}
            angle={readableAngle(w.a, w.b)}
            text={formatMeters(length)}
            color={selected.has(w.wallId) ? C.accent : C.label}
          />
        )
      })}

      {[...handleNodes].map((id) => {
        const n = project.nodes[id]
        if (!n) return null
        return <Circle key={id} x={n.x} y={n.y} radius={4.5 / k} fill="#fff" stroke={C.accent} strokeWidth={1.5} strokeScaleEnabled={false} />
      })}

      {draft?.kind === 'wall' && <DraftWall a={draft.a} b={draft.b} thickness={thickness} k={k} typed={typed} />}
      {draft?.kind === 'item' && (
        <ItemGlyph pxPerCm={k} ghost color={C.accent} item={{ ...draft, mirrored: false, params: getItem(draft.componentId).defaults.params }} />
      )}

      {draft?.kind === 'opening' && (
        <Group>
          <OpeningGlyph
            pxPerCm={k}
            s={{ ...draft, key: 'draft', params: {}, color: draft.wallId && !draft.valid ? C.invalid : C.accent, ghost: true }}
          />
          {draft.wallId && <EndDistances project={project} o={{ ...draft, wallId: draft.wallId }} k={k} color={draft.valid ? C.accent : C.invalid} />}
        </Group>
      )}

      {/* Distâncias das aberturas selecionadas até as pontas da parede */}
      {draft?.kind !== 'opening' &&
        [...selected].map((id) => {
        const o = project.openings[id]
        return o ? <EndDistances key={id} project={project} o={o} k={k} color={C.accent} /> : null
      })}

      {draft?.kind === 'measure' && (
        <Group>
          <Line points={[draft.a.x, draft.a.y, draft.b.x, draft.b.y]} stroke={C.measure} strokeWidth={1.5} strokeScaleEnabled={false} dash={[6 / k, 4 / k]} />
          {[draft.a, draft.b].map((q, i) => (
            <Circle key={i} x={q.x} y={q.y} radius={3 / k} fill={C.measure} />
          ))}
          <ScreenLabel at={midpoint(draft.a, draft.b)} k={k} pill text={formatMeters(dist(draft.a, draft.b))} />
        </Group>
      )}
      {draft?.kind === 'dimension' && <DimensionGlyph d={draft} k={k} color={C.accent} />}

      {draft?.kind === 'room' && <DraftRoom a={draft.a} b={draft.b} thickness={thickness} k={k} typed={typed} />}

      {snap && <SnapMarker snap={snap} k={k} />}

      {box && (
        <Rect
          x={Math.min(box.a.x, box.b.x)}
          y={Math.min(box.a.y, box.b.y)}
          width={Math.abs(box.b.x - box.a.x)}
          height={Math.abs(box.b.y - box.a.y)}
          fill={box.b.x < box.a.x ? C.boxTouch : C.boxContain}
          stroke={box.b.x < box.a.x ? C.boxTouchStroke : C.boxContainStroke}
          strokeWidth={1}
          strokeScaleEnabled={false}
          dash={box.b.x < box.a.x ? [4 / k, 3 / k] : undefined}
        />
      )}
    </Layer>
  )
}
