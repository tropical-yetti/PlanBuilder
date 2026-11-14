import type { Context } from 'konva/lib/Context'
import { Group, Shape } from 'react-konva'
import type { View2D } from '../../store/editorStore'
import { C } from '../theme'

interface Props {
  view: View2D
  width: number
  height: number
}

/** Grade de 10 cm (com zoom suficiente), 50 cm e 1 m, desenhada só na área visível. */
export function GridLayer({ view, width, height }: Props) {
  const sceneFunc = (ctx: Context) => {
    const x0 = -view.x / view.scale
    const y0 = -view.y / view.scale
    const x1 = (width - view.x) / view.scale
    const y1 = (height - view.y) / view.scale

    const levels: { step: number; color: string }[] = []
    if (10 * view.scale >= 7) levels.push({ step: 10, color: C.gridMinor })
    if (50 * view.scale >= 7) levels.push({ step: 50, color: C.gridMid })
    levels.push({ step: 100 * view.scale >= 5 ? 100 : 500, color: C.gridMajor })

    ctx.setAttr('lineWidth', 1 / view.scale)
    for (const { step, color } of levels) {
      ctx.beginPath()
      for (let x = Math.floor(x0 / step) * step; x <= x1; x += step) {
        ctx.moveTo(x, y0)
        ctx.lineTo(x, y1)
      }
      for (let y = Math.floor(y0 / step) * step; y <= y1; y += step) {
        ctx.moveTo(x0, y)
        ctx.lineTo(x1, y)
      }
      ctx.setAttr('strokeStyle', color)
      ctx.stroke()
    }
  }

  return (
    <Group listening={false}>
      <Shape sceneFunc={sceneFunc} />
    </Group>
  )
}
