import type { Box3, OpeningDef, ParamField, Prim } from '../../types'

/** Lados de peça mais comuns no mercado (cm). */
export const PIECE_SIZES = [20, 25, 30, 40]

export const pieceSizeOf = (params: Record<string, unknown>): number => {
  const v = Number(params.pieceSize)
  return PIECE_SIZES.includes(v) ? v : 25
}

export const COBOGO_PARAMS: ParamField[] = [
  {
    key: 'pieceSize',
    label: 'Peça',
    type: 'select',
    options: PIECE_SIZES.map((s) => ({ value: s, label: `${s} × ${s} cm` })),
  },
]

/** Na planta: faixa hachurada com as juntas das peças, em toda a espessura da parede. */
export function cobogoSymbol(w: number, t: number, params: Record<string, unknown>): Prim[] {
  const size = pieceSizeOf(params)
  const prims: Prim[] = [{ t: 'rect', x: -w / 2, y: -t / 2, w, h: t, fill: 'concrete' }]
  const n = Math.max(1, Math.round(w / size))
  const step = w / n
  for (let i = 1; i < n; i++) prims.push({ t: 'line', pts: [-w / 2 + i * step, -t / 2, -w / 2 + i * step, t / 2], thin: true })
  // diagonais, como a hachura de elementos vazados
  for (let i = 0; i < n; i++) {
    const x0 = -w / 2 + i * step
    prims.push({ t: 'line', pts: [x0, t / 2, x0 + step, -t / 2], thin: true, dash: true })
  }
  return prims
}

/** Em 3D: uma grade de nervuras na espessura da parede, com os vazados entre elas. */
export function cobogoModel(w: number, h: number, t: number, params: Record<string, unknown>): Box3[] {
  const size = pieceSizeOf(params)
  const web = Math.max(2, size * 0.14)
  const cols = Math.max(1, Math.round(w / size))
  const rows = Math.max(1, Math.round(h / size))
  const boxes: Box3[] = []
  for (let i = 0; i <= cols; i++) {
    const x = -w / 2 + (i * w) / cols
    const bw = i === 0 || i === cols ? web / 2 : web
    boxes.push({ x: i === 0 ? x + bw / 2 : i === cols ? x - bw / 2 : x, y: h / 2, z: 0, w: bw, h, d: t, mat: 'concrete' })
  }
  for (let j = 0; j <= rows; j++) {
    const y = (j * h) / rows
    const bh = j === 0 || j === rows ? web / 2 : web
    boxes.push({ x: 0, y: j === 0 ? y + bh / 2 : j === rows ? y - bh / 2 : y, z: 0, w, h: bh, d: t, mat: 'concrete' })
  }
  return boxes
}

type Base = Omit<OpeningDef, 'id' | 'name' | 'tags' | 'defaults' | 'presets' | 'fullHeight'>

export const COBOGO_BASE: Base = {
  category: 'cobogo',
  kind: 'opening',
  limits: { minWidth: 20, maxWidth: 2000, minHeight: 20, maxHeight: 1000 },
  sided: false,
  hinged: false,
  hasSill: true,
  fillsWall: true,
  paramsSchema: COBOGO_PARAMS,
  pieceSize: pieceSizeOf,
  symbol: ({ width, thickness, params }) => cobogoSymbol(width, thickness, params),
  model: ({ width, height, thickness, params }) => cobogoModel(width, height, thickness, params),
}
