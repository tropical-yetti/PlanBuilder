import type { Box3, ItemDef, Prim } from '../../types'

/**
 * Fogões de piso. Medidas dos modelos Brastemp (largura × profundidade × altura, cm):
 * - 4 bocas BFO4NBR: 51 × 65,4 × 95,5
 * - 5 bocas BFS5NCR / BFS5NDB: 77,8 × 68,1 × 97,6
 * - 6 bocas BFS6NCB: 77,8 × 68,1 × 97,6
 */

const GROUP = 'Fogões'
const TOP = 90 // altura da mesa (onde ficam as bocas)

type Layout = { x: number; y: number; r: number }[]

/** Posição das bocas, em frações da mesa (x da esquerda para a direita, y do fundo para a frente). */
function burners(count: 4 | 5 | 6): { x: number; y: number; big: boolean }[] {
  if (count === 4)
    return [
      { x: 0.27, y: 0.3, big: false },
      { x: 0.73, y: 0.3, big: true },
      { x: 0.27, y: 0.72, big: true },
      { x: 0.73, y: 0.72, big: false },
    ]
  if (count === 5)
    return [
      { x: 0.18, y: 0.3, big: false },
      { x: 0.82, y: 0.3, big: false },
      { x: 0.5, y: 0.5, big: true },
      { x: 0.18, y: 0.72, big: false },
      { x: 0.82, y: 0.72, big: false },
    ]
  return [0.18, 0.5, 0.82].flatMap((x, i) => [
    { x, y: 0.3, big: i === 1 },
    { x, y: 0.72, big: false },
  ])
}

/** A mesa ocupa a parte de trás; na frente, a faixa dos botões. */
function layout(w: number, d: number, count: 4 | 5 | 6): { burners: Layout; knobY: number; tableD: number } {
  const knobStrip = Math.min(10, d * 0.15)
  const tableD = d - knobStrip
  const base = Math.min(w / (count === 4 ? 2 : 3), tableD / 2)
  return {
    burners: burners(count).map((b) => ({ x: -w / 2 + b.x * w, y: -d / 2 + b.y * tableD, r: base * (b.big ? 0.36 : 0.28) })),
    knobY: d / 2 - knobStrip / 2,
    tableD,
  }
}

function stoveSymbol(w: number, d: number, count: 4 | 5 | 6): Prim[] {
  const l = layout(w, d, count)
  const prims: Prim[] = [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'steel', r: 2 },
    { t: 'rect', x: -w / 2 + 2, y: -d / 2 + 2, w: w - 4, h: l.tableD - 4, fill: 'dark', thin: true },
  ]
  for (const b of l.burners) {
    prims.push({ t: 'circle', cx: b.x, cy: b.y, r: b.r, fill: 'steel', thin: true })
    prims.push({ t: 'circle', cx: b.x, cy: b.y, r: b.r * 0.45, thin: true })
  }
  // botões na frente, um por boca
  for (let i = 0; i < count; i++) prims.push({ t: 'circle', cx: -w / 2 + ((i + 0.5) * w) / count, cy: l.knobY, r: 2, thin: true })
  return prims
}

function stoveModel(w: number, d: number, h: number, count: 4 | 5 | 6): Box3[] {
  const l = layout(w, d, count)
  const top = Math.min(TOP, h - 2)
  const boxes: Box3[] = [
    { x: 0, y: top / 2, z: 0, w, h: top, d, mat: 'steel' },
    // mesa de vidro escuro
    { x: 0, y: top + 0.5, z: -d / 2 + l.tableD / 2, w: w - 2, h: 1, d: l.tableD - 2, mat: 'dark' },
    // tampa traseira
    { x: 0, y: (top + h) / 2, z: -d / 2 + 1, w, h: h - top, d: 2, mat: 'steel' },
    // porta do forno
    { x: 0, y: top * 0.5, z: d / 2 + 0.5, w: w * 0.8, h: top * 0.45, d: 1, mat: 'dark' },
  ]
  for (const b of l.burners) {
    boxes.push({ x: b.x, y: top + 2, z: b.y, w: b.r * 2, h: 3, d: 0, mat: 'metal', shape: 'cylinder' })
  }
  return boxes
}

function stove(count: 4 | 5 | 6, width: number, depth: number, height: number, model: string): ItemDef {
  return {
    id: `appliance.stove-${count}`,
    category: 'appliances',
    group: GROUP,
    kind: 'item',
    name: `Fogão ${count} bocas`,
    tags: ['fogão', 'fogao', 'cozinha', 'forno', `${count} bocas`, 'brastemp', model],
    defaults: { width, depth, height, params: {} },
    limits: { minWidth: 40, maxWidth: 120, minDepth: 40, maxDepth: 90, minHeight: 60, maxHeight: 120 },
    againstWall: true,
    symbol: ({ width: w, depth: d }) => stoveSymbol(w, d, count),
    model: ({ width: w, depth: d, height: h }) => stoveModel(w, d, h, count),
  }
}

export const stove4 = stove(4, 51, 65.4, 95.5, 'BFO4NBR')
export const stove5 = stove(5, 77.8, 68.1, 97.6, 'BFS5NCR')
export const stove6 = stove(6, 77.8, 68.1, 97.6, 'BFS6NCB')
