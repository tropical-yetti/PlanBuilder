import type { Context } from 'konva/lib/Context'
import { FILL_COLORS } from '../library/prims'
import type { Prim } from '../library/types'

/** Desenha as primitivas de um símbolo no canvas do Konva. `px` = 1 pixel de tela em cm. */
export function drawPrims(ctx: Context, prims: Prim[], px: number, color: string): void {
  for (const p of prims) {
    ctx.beginPath()
    ctx.setAttr('lineWidth', (p.thin ? 1 : 1.5) * px)
    ctx.setAttr('strokeStyle', color)
    ctx.setLineDash('dash' in p && p.dash ? [4 * px, 3 * px] : [])
    const fill = 'fill' in p ? p.fill : undefined
    if (p.t === 'line') {
      ctx.moveTo(p.pts[0]!, p.pts[1]!)
      for (let i = 2; i < p.pts.length; i += 2) ctx.lineTo(p.pts[i]!, p.pts[i + 1]!)
      if (p.closed) ctx.closePath()
    } else if (p.t === 'arc') {
      ctx.arc(p.cx, p.cy, p.r, p.a0, p.a1, p.a1 < p.a0)
    } else if (p.t === 'circle') {
      ctx.arc(p.cx, p.cy, p.r, 0, 2 * Math.PI, false)
    } else if (p.r) {
      const r = Math.min(p.r, p.w / 2, p.h / 2)
      ctx.moveTo(p.x + r, p.y)
      ctx.arcTo(p.x + p.w, p.y, p.x + p.w, p.y + p.h, r)
      ctx.arcTo(p.x + p.w, p.y + p.h, p.x, p.y + p.h, r)
      ctx.arcTo(p.x, p.y + p.h, p.x, p.y, r)
      ctx.arcTo(p.x, p.y, p.x + p.w, p.y, r)
      ctx.closePath()
    } else {
      ctx.rect(p.x, p.y, p.w, p.h)
    }
    if (fill) {
      ctx.setAttr('fillStyle', FILL_COLORS[fill])
      ctx.fill()
    }
    ctx.stroke()
  }
  ctx.setLineDash([])
}
