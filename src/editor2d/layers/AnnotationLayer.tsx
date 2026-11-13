import { Group, Label, Line, Tag, Text } from 'react-konva'
import { dimensionGeometry, textSize } from '../../model/annotations'
import { add, angleOf, scale, sub } from '../../model/geometry'
import { formatMeters } from '../../model/units'
import type { Dimension, Id, Point, Project } from '../../model/types'
import { C } from '../theme'

/** Ângulo em graus para o texto ficar legível (nunca de cabeça para baixo). */
function readable(a: Point, b: Point): number {
  let deg = (angleOf(sub(b, a)) * 180) / Math.PI
  if (deg > 90) deg -= 180
  if (deg <= -90) deg += 180
  return deg
}

/** Desenho de uma cota: linhas de chamada, linha de medida com marcas nas pontas e o valor. */
export function DimensionGlyph({ d, k, color }: { d: Pick<Dimension, 'p1' | 'p2' | 'offset'>; k: number; color: string }) {
  const g = dimensionGeometry(d)
  const sign = d.offset >= 0 ? 1 : -1
  const over = scale(g.normal, (sign * 6) / k)
  const tick = scale(add(g.normal, { x: -g.normal.y, y: g.normal.x }), 4 / k)
  const line = { stroke: color, strokeWidth: 1, strokeScaleEnabled: false }
  return (
    <Group>
      <Line points={[d.p1.x, d.p1.y, g.a.x + over.x, g.a.y + over.y]} {...line} opacity={0.6} />
      <Line points={[d.p2.x, d.p2.y, g.b.x + over.x, g.b.y + over.y]} {...line} opacity={0.6} />
      <Line points={[g.a.x, g.a.y, g.b.x, g.b.y]} {...line} />
      {[g.a, g.b].map((q, i) => (
        <Line key={i} points={[q.x - tick.x, q.y - tick.y, q.x + tick.x, q.y + tick.y]} {...line} strokeWidth={1.5} />
      ))}
      <Label x={g.mid.x} y={g.mid.y} scaleX={1 / k} scaleY={1 / k} rotation={readable(g.a, g.b)}>
        <Tag fill={C.labelBg} cornerRadius={3} />
        <Text
          text={formatMeters(g.length)}
          fontSize={12}
          fontFamily="system-ui, sans-serif"
          fill={color}
          padding={2}
          ref={(node) => {
            if (node) {
              node.getParent()?.offsetX(node.width() / 2)
              node.getParent()?.offsetY(node.height() / 2)
            }
          }}
        />
      </Label>
    </Group>
  )
}

interface Props {
  project: Project
  pxPerCm: number
  selected: Set<Id>
  hovered: Id | null
  hoverColor: string
  showDimensions: boolean
  showTexts: boolean
  /** Texto em edição: some para dar lugar ao campo de texto. */
  editingText: Id | null
}

/** Cotas manuais e textos. Os textos têm tamanho em centímetros: crescem e diminuem com o zoom, como o desenho. */
export function AnnotationLayer({ project, pxPerCm: k, selected, hovered, hoverColor, showDimensions, showTexts, editingText }: Props) {
  const isLocked = (id: Id) => !!(project.texts[id]?.locked || project.dimensions[id]?.locked)
  const colorOf = (id: Id) => (selected.has(id) ? C.accent : hovered === id ? hoverColor : isLocked(id) ? C.locked : C.annotation)
  return (
    <Group listening={false}>
      {showDimensions && Object.values(project.dimensions).map((d) => <DimensionGlyph key={d.id} d={d} k={k} color={colorOf(d.id)} />)}
      {showTexts &&
        Object.values(project.texts).map((t) => {
          if (t.id === editingText) return null
          const { width, height } = textSize(t)
          return (
            <Text
              key={t.id}
              x={t.x}
              y={t.y}
              text={t.text}
              fontSize={t.size}
              fontFamily="system-ui, sans-serif"
              fill={colorOf(t.id)}
              rotation={t.rotation}
              width={width * 1.5}
              height={height}
              offsetX={(width * 1.5) / 2}
              offsetY={height / 2}
              align="center"
              verticalAlign="middle"
              lineHeight={1.2}
              wrap="none"
            />
          )
        })}
    </Group>
  )
}
