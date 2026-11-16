import type { Context } from 'konva/lib/Context'
import { Group, Rect, Shape, Text } from 'react-konva'
import { minPieceSize } from '../../model/floorPattern'
import type { Room } from '../../model/quantities'
import { formatArea } from '../../model/units'
import { floorTexture } from '../floorTexture'
import { C } from '../theme'

interface Props {
  rooms: Room[]
  pxPerCm: number
  highlighted: string | null
  /** Cômodo sendo renomeado: o rótulo some para dar lugar ao campo de texto. */
  editing: string | null
  showLabels: boolean
  /** Desenha os pisos aplicados (camada "Pisos"). */
  showFloors?: boolean
  /** Cômodo selecionado: contorno destacado. */
  selected?: string | null
  /** O piso fica embaixo de tudo; os nomes ficam por cima dos móveis, para não serem cobertos. */
  part?: 'floor' | 'labels'
}

const LABEL_W = 160

/** Largura aproximada do rótulo (nome ou área, o que for maior), em pixels. */
const labelWidth = (room: Room) => Math.max(room.name.length * 7.5, formatArea(room.area).length * 6.8) + 14

/** Abaixo disso (pixels na tela), as peças viram ruído: o piso é pintado liso. */
const MIN_PIECE_PX = 3

function tracePath(ctx: Context, room: Room) {
  ctx.beginPath()
  for (const poly of room.shape) {
    for (const ring of poly) {
      ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
      ctx.closePath()
    }
  }
}

/** Pinta o piso do cômodo: as peças, se der para vê-las, ou a cor do piso. */
function fillFloor(ctx: Context, room: Room, k: number) {
  const f = room.floor!
  const tex = minPieceSize(f) * k >= MIN_PIECE_PX ? floorTexture(f) : null
  const native = ctx._context
  const pattern = tex ? native.createPattern(tex.canvas, 'repeat') : null
  if (tex && pattern) {
    // O padrão começa no ponto do piso e gira com a paginação.
    pattern.setTransform(new DOMMatrix().translate(f.x, f.y).rotate(tex.tile.angle).scale(tex.tile.w / tex.canvas.width, tex.tile.h / tex.canvas.height))
    ctx.setAttr('fillStyle', pattern)
  } else {
    ctx.setAttr('fillStyle', f.color)
  }
  ctx.fill('evenodd')
}

/** Piso dos cômodos detectados, com nome e área no centro. */
export function RoomLayer({ rooms, pxPerCm: k, highlighted, editing, showLabels, showFloors = true, selected = null, part = 'floor' }: Props) {
  return (
    <Group listening={false}>
      {rooms.map((room) => {
        const sceneFunc = (ctx: Context) => {
          tracePath(ctx, room)
          if (room.floor && showFloors) {
            fillFloor(ctx, room, k)
            if (room.key === highlighted) {
              ctx.setAttr('fillStyle', C.roomHighlight)
              ctx.fill('evenodd')
            }
          } else {
            ctx.setAttr('fillStyle', room.key === highlighted ? C.roomHighlight : C.room)
            ctx.fill('evenodd')
          }
        }
        // Contorno do cômodo selecionado, por cima dos móveis.
        const outline = (ctx: Context) => {
          tracePath(ctx, room)
          ctx.setAttr('strokeStyle', C.accent)
          ctx.setAttr('lineWidth', 2.5 / k)
          ctx.setLineDash([8 / k, 5 / k])
          ctx.stroke()
          ctx.setLineDash([])
        }
        // Em cômodos pequenos na tela, o rótulo atrapalharia mais do que ajuda.
        const showLabel = part === 'labels' && showLabels && Math.sqrt(room.area) * k >= 70 && room.key !== editing
        return (
          <Group key={room.key}>
            {part === 'floor' && <Shape sceneFunc={sceneFunc} />}
            {part === 'labels' && room.key === selected && <Shape sceneFunc={outline} />}
            {showLabel && (
              <Group x={room.labelPoint.x} y={room.labelPoint.y} scaleX={1 / k} scaleY={1 / k}>
                {/* Fundo claro: o nome continua legível sobre móveis. */}
                <Rect
                  x={-Math.min(LABEL_W, labelWidth(room)) / 2}
                  y={-18}
                  width={Math.min(LABEL_W, labelWidth(room))}
                  height={36}
                  cornerRadius={4}
                  fill="rgba(255, 255, 255, 0.82)"
                />
                <Text
                  text={room.name}
                  width={LABEL_W}
                  offsetX={LABEL_W / 2}
                  y={-15}
                  align="center"
                  fontSize={13}
                  fontStyle={room.named ? 'bold' : 'normal'}
                  fontFamily="system-ui, sans-serif"
                  fill={room.named ? C.roomName : C.roomAuto}
                  wrap="none"
                  ellipsis
                />
                <Text
                  text={formatArea(room.area)}
                  width={LABEL_W}
                  offsetX={LABEL_W / 2}
                  y={2}
                  align="center"
                  fontSize={12}
                  fontFamily="system-ui, sans-serif"
                  fill={C.roomAuto}
                />
              </Group>
            )}
          </Group>
        )
      })}
    </Group>
  )
}
