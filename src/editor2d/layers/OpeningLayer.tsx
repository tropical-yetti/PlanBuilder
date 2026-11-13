import type { Context } from 'konva/lib/Context'
import { Group, Shape } from 'react-konva'
import { getComponent } from '../../library/registry'
import type { Prim } from '../../library/types'
import type { OpeningShape } from '../openingShapes'
import { C } from '../theme'

function drawPrims(ctx: Context, prims: Prim[], px: number, color: string) {
  for (const p of prims) {
    ctx.beginPath()
    ctx.setAttr('lineWidth', (p.thin ? 1 : 1.5) * px)
    ctx.setAttr('strokeStyle', color)
    ctx.setLineDash('dash' in p && p.dash ? [4 * px, 3 * px] : [])
    if (p.t === 'line') {
      ctx.moveTo(p.pts[0]!, p.pts[1]!)
      for (let i = 2; i < p.pts.length; i += 2) ctx.lineTo(p.pts[i]!, p.pts[i + 1]!)
      ctx.stroke()
    } else if (p.t === 'arc') {
      ctx.arc(p.cx, p.cy, p.r, p.a0, p.a1, p.a1 < p.a0)
      ctx.stroke()
    } else {
      ctx.rect(p.x, p.y, p.w, p.h)
      if (p.fill) {
        ctx.setAttr('fillStyle', p.fill === 'glass' ? C.glass : C.leaf)
        ctx.fill()
      }
      ctx.stroke()
    }
  }
  ctx.setLineDash([])
}

/** Uma abertura: "apaga" o trecho da parede (o vão) e desenha o símbolo do componente por cima. */
export function OpeningGlyph({ s, pxPerCm }: { s: OpeningShape; pxPerCm: number }) {
  const px = 1 / pxPerCm
  const def = getComponent(s.componentId)
  const sceneFunc = (ctx: Context) => {
    const { width: w, thickness: t } = s
    // vão: cobre a parede (e o contorno dela) com a cor do fundo
    ctx.beginPath()
    ctx.rect(-w / 2, -t / 2 - 2 * px, w, t + 4 * px)
    ctx.setAttr('fillStyle', C.canvas)
    ctx.fill()
    // ombreiras: as duas "testas" da parede nas bordas do vão
    ctx.beginPath()
    ctx.moveTo(-w / 2, -t / 2)
    ctx.lineTo(-w / 2, t / 2)
    ctx.moveTo(w / 2, -t / 2)
    ctx.lineTo(w / 2, t / 2)
    ctx.setAttr('lineWidth', 1.5 * px)
    ctx.setAttr('strokeStyle', C.wallStroke)
    ctx.stroke()
    drawPrims(ctx, def.symbol({ width: w, thickness: t, params: s.params }), px, s.color)
  }
  return (
    <Group
      x={s.at.x}
      y={s.at.y}
      rotation={s.angle}
      scaleX={s.flipHinge ? -1 : 1}
      scaleY={s.flipSide ? -1 : 1}
      opacity={s.ghost ? 0.75 : 1}
    >
      <Shape sceneFunc={sceneFunc} />
    </Group>
  )
}

export function OpeningLayer({ shapes, pxPerCm }: { shapes: OpeningShape[]; pxPerCm: number }) {
  return (
    <Group listening={false}>
      {shapes.map((s) => (
        <OpeningGlyph key={s.key} s={s} pxPerCm={pxPerCm} />
      ))}
    </Group>
  )
}
