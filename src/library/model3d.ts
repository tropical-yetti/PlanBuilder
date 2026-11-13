/** Peças comuns dos modelos 3D de portas e janelas. */
import type { Box3 } from './types'

/** Largura do batente/caixilho visto de frente. */
export const FRAME = 4
/** Quanto as folhas das portas aparecem abertas na vista 3D. */
export const AJAR = 28

/** Batente: duas ombreiras e a travessa de cima; com `bottom`, também a de baixo (janelas). */
export function frameBoxes(w: number, h: number, t: number, bottom = false): Box3[] {
  const d = t + 2
  const boxes: Box3[] = [
    { x: -w / 2 + FRAME / 2, y: h / 2, z: 0, w: FRAME, h, d, mat: 'frame' },
    { x: w / 2 - FRAME / 2, y: h / 2, z: 0, w: FRAME, h, d, mat: 'frame' },
    { x: 0, y: h - FRAME / 2, z: 0, w: w - 2 * FRAME, h: FRAME, d, mat: 'frame' },
  ]
  if (bottom) boxes.push({ x: 0, y: FRAME / 2, z: 0, w: w - 2 * FRAME, h: FRAME, d, mat: 'frame' })
  return boxes
}

/** Folha de porta com dobradiça em `hingeX`, estendendo-se por `leafW` no sentido `dir` (+1 ou -1). */
export function doorLeaf(hingeX: number, dir: 1 | -1, leafW: number, h: number): Box3 {
  return {
    x: hingeX + (dir * leafW) / 2,
    y: (h - FRAME) / 2,
    z: 0,
    w: leafW,
    h: h - FRAME,
    d: 4,
    mat: 'leaf',
    pivot: { x: hingeX, z: 0 },
    angle: dir * AJAR,
  }
}

/** Vidro ocupando o vão por dentro do caixilho, no plano `z`. */
export function glass(x0: number, x1: number, h: number, z = 0): Box3 {
  return { x: (x0 + x1) / 2, y: h / 2, z, w: x1 - x0, h: h - 2 * FRAME, d: 1, mat: 'glass' }
}

/** Montante vertical (divisão entre folhas). */
export function mullion(x: number, h: number, z = 0, d = 4): Box3 {
  return { x, y: h / 2, z, w: 3, h: h - 2 * FRAME, d, mat: 'frame' }
}
