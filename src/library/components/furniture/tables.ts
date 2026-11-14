import type { Box3, ItemDef, ItemPreset, ParamField, Prim } from '../../types'

const GROUP = 'Mesas'
const CHAIR = 42
/** Quanto a cadeira avança para baixo do tampo. */
const TUCK = 10
const CHAIR_PARAMS: ParamField[] = [{ key: 'chairs', label: 'Com cadeiras', type: 'boolean' }]

interface Chair {
  x: number
  y: number
  /** Direção para onde a cadeira está virada (para a mesa), em radianos. */
  facing: number
}

/** Lugares de mesas retangulares: 60 cm por pessoa nos lados maiores; cabeceiras a partir de 90 cm. */
export function rectChairs(w: number, d: number): Chair[] {
  const chairs: Chair[] = []
  const along = (len: number) => Math.max(1, Math.floor(len / 60))
  const nx = along(w)
  for (let i = 0; i < nx; i++) {
    const x = -w / 2 + ((i + 0.5) * w) / nx
    chairs.push({ x, y: -d / 2 - CHAIR / 2 + TUCK, facing: Math.PI / 2 })
    chairs.push({ x, y: d / 2 + CHAIR / 2 - TUCK, facing: -Math.PI / 2 })
  }
  // Cabeceiras: na mesa quadrada sempre; na retangular, só se couber uma pessoa.
  const ny = w === d ? along(d) : d >= 90 ? 1 : 0
  for (let j = 0; j < ny; j++) {
    const y = -d / 2 + ((j + 0.5) * d) / ny
    chairs.push({ x: -w / 2 - CHAIR / 2 + TUCK, y, facing: 0 })
    chairs.push({ x: w / 2 + CHAIR / 2 - TUCK, y, facing: Math.PI })
  }
  return chairs
}

/** Lugares de mesas redondas: 60 cm de borda por pessoa. */
export function roundChairs(diameter: number): Chair[] {
  const n = Math.min(12, Math.max(2, Math.floor((Math.PI * diameter) / 60)))
  const r = diameter / 2 + CHAIR / 2 - TUCK
  return Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, facing: a + Math.PI }
  })
}

/** Cadeira na planta: assento quadrado e o encosto do lado de fora. */
function chairSymbol(c: Chair): Prim[] {
  const f = { x: Math.cos(c.facing), y: Math.sin(c.facing) }
  const r = { x: -f.y, y: f.x }
  const h = CHAIR / 2
  const pt = (along: number, side: number) => [c.x + f.x * along + r.x * side, c.y + f.y * along + r.y * side]
  const seat = [...pt(h, -h), ...pt(h, h), ...pt(-h, h), ...pt(-h, -h)]
  const back = [...pt(-h, -h), ...pt(-h, h), ...pt(-h + 6, h), ...pt(-h + 6, -h)]
  return [
    { t: 'line', pts: seat, closed: true, fill: 'solid', thin: true },
    { t: 'line', pts: back, closed: true, fill: 'wood', thin: true },
  ]
}

function chairModel(c: Chair): Box3[] {
  const deg = (c.facing * 180) / Math.PI
  const pivot = { x: c.x, z: c.y }
  // No sistema da cadeira, x aponta para a mesa; o giro em torno do centro a vira para o lugar certo.
  return [
    { x: c.x, y: 45, z: c.y, w: CHAIR, h: 4, d: CHAIR, mat: 'wood', pivot, angle: deg },
    { x: c.x - CHAIR / 2 + 2, y: 68, z: c.y, w: 4, h: 42, d: CHAIR, mat: 'wood', pivot, angle: deg },
    { x: c.x, y: 22, z: c.y, w: CHAIR - 8, h: 44, d: CHAIR - 8, mat: 'metal', pivot, angle: deg },
  ]
}

const withChairs = (params: Record<string, unknown>) => params.chairs !== false

function rectTableModel(w: number, d: number, h: number): Box3[] {
  const leg = 6
  const boxes: Box3[] = [{ x: 0, y: h - 2, z: 0, w, h: 4, d, mat: 'wood' }]
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) boxes.push({ x: sx * (w / 2 - 8), y: (h - 4) / 2, z: sz * (d / 2 - 8), w: leg, h: h - 4, d: leg, mat: 'wood' })
  return boxes
}

const seatsLabel = (n: number) => `${n} ${n === 1 ? 'lugar' : 'lugares'}`

function table(id: string, name: string, tags: string[], presets: ItemPreset[], def: { width: number; depth: number }, limits: ItemDef['limits']): ItemDef {
  return {
    id,
    category: 'furniture',
    group: GROUP,
    kind: 'item',
    name,
    tags: [...tags, 'mesa', 'jantar', 'refeição', 'cadeiras'],
    defaults: { width: def.width, depth: def.depth, height: 75, params: { chairs: true } },
    presets,
    limits,
    againstWall: false,
    paramsSchema: CHAIR_PARAMS,
    symbol: ({ width, depth, params }) => [
      ...(withChairs(params) ? rectChairs(width, depth).flatMap(chairSymbol) : []),
      { t: 'rect', x: -width / 2, y: -depth / 2, w: width, h: depth, fill: 'wood', r: 2 },
    ],
    model: ({ width, depth, height, params }) => [...rectTableModel(width, depth, height), ...(withChairs(params) ? rectChairs(width, depth).flatMap(chairModel) : [])],
  }
}

const squarePreset = (s: number): ItemPreset => ({ label: `${s} × ${s} · ${seatsLabel(rectChairs(s, s).length)}`, width: s, depth: s })
const rectPreset = (w: number, d: number): ItemPreset => ({ label: `${w} × ${d} · ${seatsLabel(rectChairs(w, d).length)}`, width: w, depth: d })
const roundPreset = (s: number): ItemPreset => ({ label: `⌀ ${s} · ${seatsLabel(roundChairs(s).length)}`, width: s, depth: s })

export const tableSquare = table(
  'furniture.table-square',
  'Mesa quadrada',
  ['quadrada'],
  [70, 80, 90, 100, 120].map(squarePreset),
  { width: 90, depth: 90 },
  { minWidth: 50, maxWidth: 200, minDepth: 50, maxDepth: 200, minHeight: 40, maxHeight: 110 },
)

export const tableRect = table(
  'furniture.table-rect',
  'Mesa retangular',
  ['retangular'],
  [rectPreset(120, 80), rectPreset(160, 90), rectPreset(200, 100), rectPreset(240, 100)],
  { width: 160, depth: 90 },
  { minWidth: 60, maxWidth: 400, minDepth: 50, maxDepth: 150, minHeight: 40, maxHeight: 110 },
)

export const tableRound: ItemDef = {
  id: 'furniture.table-round',
  category: 'furniture',
  group: GROUP,
  kind: 'item',
  name: 'Mesa redonda',
  tags: ['redonda', 'circular', 'mesa', 'jantar', 'refeição', 'cadeiras'],
  defaults: { width: 110, depth: 110, height: 75, params: { chairs: true } },
  presets: [80, 90, 110, 120, 150].map(roundPreset),
  limits: { minWidth: 50, maxWidth: 250, minDepth: 50, maxDepth: 250, minHeight: 40, maxHeight: 110 },
  round: true,
  againstWall: false,
  paramsSchema: CHAIR_PARAMS,
  symbol: ({ width, params }) => [...(withChairs(params) ? roundChairs(width).flatMap(chairSymbol) : []), { t: 'circle', cx: 0, cy: 0, r: width / 2, fill: 'wood' }],
  model: ({ width, height, params }) => [
    { x: 0, y: height - 2, z: 0, w: width, h: 4, d: width, mat: 'wood', shape: 'cylinder' },
    { x: 0, y: (height - 4) / 2, z: 0, w: 10, h: height - 4, d: 10, mat: 'wood', shape: 'cylinder' },
    { x: 0, y: 1.5, z: 0, w: Math.min(60, width * 0.55), h: 3, d: 0, mat: 'wood', shape: 'cylinder' },
    ...(withChairs(params) ? roundChairs(width).flatMap(chairModel) : []),
  ],
}
