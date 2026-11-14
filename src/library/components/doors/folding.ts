import { FRAME, frameBoxes } from '../../model3d'
import type { Box3, OpeningDef, Prim } from '../../types'

/** Largura aproximada de cada lâmina da porta sanfonada (cm). */
const SLAT = 12
/** Parte do vão ocupada pelas lâminas recolhidas no desenho (porta mostrada meio aberta). */
const STACK = 0.4

/** Pontos do zigue-zague das lâminas recolhidas junto à dobradiça (lado esquerdo), saindo para o lado de abertura. */
function zigzag(w: number): { pts: { x: number; y: number }[]; slat: number } {
  const inner = w - 2 * FRAME
  const n = Math.max(4, Math.round(inner / SLAT))
  const slat = inner / n
  const span = inner * STACK
  const step = span / n
  const amp = Math.sqrt(Math.max(0, slat * slat - step * step))
  const x0 = -w / 2 + FRAME
  const pts = Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + i * step, y: i % 2 === 0 ? 0 : amp }))
  return { pts, slat }
}

export const doorFolding: OpeningDef = {
  id: 'door.folding',
  category: 'doors',
  kind: 'opening',
  name: 'Porta sanfonada',
  tags: ['porta', 'sanfonada', 'sanfona', 'camarão', 'dobrável', 'pvc', 'lavanderia', 'closet', 'despensa'],
  defaults: { width: 80, height: 210, sillHeight: 0, params: {} },
  presets: [60, 70, 80, 90, 120],
  limits: { minWidth: 50, maxWidth: 300, minHeight: 180, maxHeight: 300 },
  sided: true,
  hinged: true,
  hasSill: false,
  symbol({ width: w }) {
    const { pts } = zigzag(w)
    const last = pts.at(-1)!
    const prims: Prim[] = [
      // trilho no alto do vão
      { t: 'line', pts: [-w / 2, 0, w / 2, 0], dash: true, thin: true },
      // lâminas recolhidas em zigue-zague
      { t: 'line', pts: pts.flatMap((p) => [p.x, p.y]) },
      // caminho que a ponta da porta percorre até fechar
      { t: 'line', pts: [last.x, last.y, w / 2 - FRAME, 0], dash: true, thin: true },
    ]
    return prims
  },
  model({ width: w, height: h, thickness: t }) {
    const { pts, slat } = zigzag(w)
    const boxes: Box3[] = [...frameBoxes(w, h, t), { x: 0, y: h - FRAME - 1, z: 0, w: w - 2 * FRAME, h: 2, d: 3, mat: 'metal' }]
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]!
      const b = pts[i + 1]!
      const mid = { x: (a.x + b.x) / 2, z: (a.y + b.y) / 2 }
      // cada lâmina gira em torno do próprio centro até a inclinação do zigue-zague
      const angle = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI
      boxes.push({ x: mid.x, y: (h - FRAME) / 2, z: mid.z, w: slat, h: h - FRAME - 2, d: 1.5, mat: 'leaf', pivot: { x: mid.x, z: mid.z }, angle })
    }
    return boxes
  },
}
