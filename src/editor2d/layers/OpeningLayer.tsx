import type { Context } from 'konva/lib/Context'
import { Group, Shape } from 'react-konva'
import { getComponent } from '../../library/registry'
import { drawPrims } from '../drawPrims'
import type { OpeningShape } from '../openingShapes'
import { C } from '../theme'

/** Uma abertura: "apaga" o trecho da parede (o vão) e desenha o símbolo do componente por cima. */
export function OpeningGlyph({ s, pxPerCm, gapColor = C.canvas }: { s: OpeningShape; pxPerCm: number; /** Cor do fundo, usada para "apagar" a parede no vão. */ gapColor?: string }) {
  const px = 1 / pxPerCm
  const def = getComponent(s.componentId)
  const sceneFunc = (ctx: Context) => {
    const { width: w, thickness: t } = s
    // vão: cobre a parede (e o contorno dela) com a cor do fundo
    ctx.beginPath()
    ctx.rect(-w / 2, -t / 2 - 2 * px, w, t + 4 * px)
    ctx.setAttr('fillStyle', gapColor)
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

export function OpeningLayer({ shapes, pxPerCm, gapColor }: { shapes: OpeningShape[]; pxPerCm: number; gapColor?: string }) {
  return (
    <Group listening={false}>
      {shapes.map((s) => (
        <OpeningGlyph key={s.key} s={s} pxPerCm={pxPerCm} gapColor={gapColor} />
      ))}
    </Group>
  )
}
