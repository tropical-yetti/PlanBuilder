import type { Context } from 'konva/lib/Context'
import { Group, Shape, Text } from 'react-konva'
import type { Room } from '../../model/quantities'
import { formatArea } from '../../model/units'
import { C } from '../theme'

interface Props {
  rooms: Room[]
  pxPerCm: number
  highlighted: string | null
  /** Cômodo sendo renomeado: o rótulo some para dar lugar ao campo de texto. */
  editing: string | null
  showLabels: boolean
}

const LABEL_W = 160

/** Piso dos cômodos detectados, com nome e área no centro. */
export function RoomLayer({ rooms, pxPerCm: k, highlighted, editing, showLabels }: Props) {
  return (
    <Group listening={false}>
      {rooms.map((room) => {
        const sceneFunc = (ctx: Context) => {
          ctx.beginPath()
          for (const poly of room.shape) {
            for (const ring of poly) {
              ring.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)))
              ctx.closePath()
            }
          }
          ctx.setAttr('fillStyle', room.key === highlighted ? C.roomHighlight : C.room)
          ctx.fill('evenodd')
        }
        // Em cômodos pequenos na tela, o rótulo atrapalharia mais do que ajuda.
        const showLabel = showLabels && Math.sqrt(room.area) * k >= 70 && room.key !== editing
        return (
          <Group key={room.key}>
            <Shape sceneFunc={sceneFunc} />
            {showLabel && (
              <Group x={room.labelPoint.x} y={room.labelPoint.y} scaleX={1 / k} scaleY={1 / k}>
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
