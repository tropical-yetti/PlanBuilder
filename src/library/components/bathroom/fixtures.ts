import type { Box3, ItemDef, ItemPreset, ParamField, Prim } from '../../types'

/**
 * Louças e peças de banheiro, com medidas de mercado (largura × profundidade × altura, cm):
 * - bacia com caixa acoplada: 37 × 65 × 78; bacia suspensa e bidê: 36 × 54 × 40;
 * - lavatório de coluna: 50 × 43 × 85; gabinete com cuba: 60 × 45 × 85 (de 50 a 120 de largura);
 * - box de chuveiro: 90 × 90 (mínimo usual 80 × 80), vidro com 190 de altura;
 * - banheira: 170 × 70 × 55 (de 150 a 180 de comprimento).
 * Como os outros móveis, o fundo (y negativo) encosta na parede.
 */

const FIXTURES = 'Bacias e bidê'
const VANITIES = 'Lavatórios e gabinetes'
const BATH = 'Box e banheira'

/** Elipse como polígono fechado (as primitivas não têm elipse). */
function ellipse(cx: number, cy: number, rx: number, ry: number, extra: Partial<Extract<Prim, { t: 'line' }>> = {}): Prim {
  const pts: number[] = []
  const n = 28
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    pts.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)
  }
  return { t: 'line', pts, closed: true, ...extra }
}

/** Torneira: bolinha no fundo da peça. */
const faucetDot = (x: number, y: number): Prim => ({ t: 'circle', cx: x, cy: y, r: 2, fill: 'steel', thin: true })
const drain = (x: number, y: number): Prim => ({ t: 'circle', cx: x, cy: y, r: 2.5, thin: true })

/** Torneira 3D: coluna e bica apontando para a frente. */
function faucet(x: number, y: number, z: number, reach = 12): Box3[] {
  return [
    { x, y: y + 9, z, w: 3, h: 18, d: 0, mat: 'metal', shape: 'cylinder' },
    { x, y: y + 17, z: z + reach / 2, w: 2.2, h: 2.2, d: reach, mat: 'metal' },
  ]
}

const sizes = (list: [number, number][]): ItemPreset[] => list.map(([w, d]) => ({ label: `${w} × ${d}`, width: w, depth: d }))
const widths = (list: number[], depth: number): ItemPreset[] => list.map((w) => ({ label: `${w} cm`, width: w, depth }))

// ---------------------------------------------------------------------------------------------
// Bacias e bidê

const TANK = 18

export const toiletTank: ItemDef = {
  id: 'bathroom.toilet-tank',
  category: 'bathroom',
  group: FIXTURES,
  kind: 'item',
  name: 'Bacia com caixa acoplada',
  tags: ['vaso', 'vaso sanitário', 'privada', 'bacia', 'caixa acoplada', 'louça', 'banheiro', 'lavabo'],
  defaults: { width: 37, depth: 65, height: 78, params: {} },
  limits: { minWidth: 32, maxWidth: 45, minDepth: 55, maxDepth: 75, minHeight: 60, maxHeight: 95 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => {
    const tank = Math.min(TANK, d * 0.3)
    const ry = (d - tank) / 2
    const cy = -d / 2 + tank + ry
    return [
      ellipse(0, cy, w / 2 - 1, ry, { fill: 'solid' }),
      ellipse(0, cy + ry * 0.12, w * 0.3, ry * 0.62, { fill: 'soft', thin: true }),
      { t: 'rect', x: -w / 2, y: -d / 2, w, h: tank, fill: 'solid', r: 3 },
    ]
  },
  model: ({ width: w, depth: d, height: h }) => {
    const tank = Math.min(TANK, d * 0.3)
    const seat = Math.min(40, h - 20)
    const bowlD = d - tank
    const bowlZ = -d / 2 + tank + bowlD / 2
    return [
      { x: 0, y: (seat - 12) / 2, z: bowlZ - 4, w: w * 0.55, h: seat - 12, d: bowlD * 0.6, mat: 'porcelain' },
      { x: 0, y: seat - 6, z: bowlZ, w: w - 2, h: 12, d: bowlD, mat: 'porcelain' },
      // tampa
      { x: 0, y: seat + 1, z: bowlZ, w: w - 4, h: 2, d: bowlD - 4, mat: 'porcelain' },
      // caixa acoplada
      { x: 0, y: (seat + h) / 2 - 6, z: -d / 2 + tank / 2, w, h: h - seat + 12, d: tank, mat: 'porcelain' },
      { x: w * 0.25, y: h + 0.5, z: -d / 2 + tank / 2, w: 3, h: 1, d: 3, mat: 'metal' },
    ]
  },
}

/** Bacia ou bidê sem caixa: louça presa à parede (suspensa) ou apoiada no piso. */
function bowlSymbol(w: number, d: number, bidet: boolean): Prim[] {
  const back = 8
  const ry = (d - back) / 2
  const cy = -d / 2 + back + ry
  return [
    { t: 'rect', x: -w * 0.35, y: -d / 2, w: w * 0.7, h: back + 4, fill: 'solid', r: 2 },
    ellipse(0, cy, w / 2 - 1, ry, { fill: 'solid' }),
    ellipse(0, cy + ry * 0.1, w * 0.3, ry * 0.6, { fill: 'soft', thin: true }),
    ...(bidet ? [faucetDot(0, -d / 2 + back + 5), drain(0, cy + ry * 0.1)] : []),
  ]
}

export const toiletWallHung: ItemDef = {
  id: 'bathroom.toilet-wall-hung',
  category: 'bathroom',
  group: FIXTURES,
  kind: 'item',
  name: 'Bacia suspensa',
  tags: ['vaso', 'vaso sanitário', 'privada', 'bacia', 'suspensa', 'caixa embutida', 'louça', 'banheiro', 'lavabo'],
  defaults: { width: 36, depth: 54, height: 40, params: {} },
  limits: { minWidth: 32, maxWidth: 45, minDepth: 45, maxDepth: 65, minHeight: 35, maxHeight: 50 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => bowlSymbol(w, d, false),
  model: ({ width: w, depth: d, height: h }) => [
    // sem pé: só a louça, presa à parede
    { x: 0, y: h - 9, z: 0, w: w - 2, h: 18, d, mat: 'porcelain' },
    { x: 0, y: h + 1, z: 2, w: w - 4, h: 2, d: d - 6, mat: 'porcelain' },
    // placa de acionamento na parede
    { x: 0, y: h + 60, z: -d / 2 + 0.5, w: 22, h: 15, d: 1, mat: 'steel' },
  ],
}

export const bidet: ItemDef = {
  id: 'bathroom.bidet',
  category: 'bathroom',
  group: FIXTURES,
  kind: 'item',
  name: 'Bidê',
  tags: ['bidê', 'bide', 'louça', 'banheiro'],
  defaults: { width: 36, depth: 54, height: 40, params: {} },
  limits: { minWidth: 32, maxWidth: 45, minDepth: 45, maxDepth: 65, minHeight: 35, maxHeight: 50 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => bowlSymbol(w, d, true),
  model: ({ width: w, depth: d, height: h }) => [
    { x: 0, y: (h - 14) / 2, z: -2, w: w * 0.55, h: h - 14, d: d * 0.6, mat: 'porcelain' },
    { x: 0, y: h - 7, z: 0, w: w - 2, h: 14, d, mat: 'porcelain' },
    ...faucet(0, h, -d / 2 + 6, 6),
  ],
}

// ---------------------------------------------------------------------------------------------
// Lavatórios

export const pedestalSink: ItemDef = {
  id: 'bathroom.pedestal-sink',
  category: 'bathroom',
  group: VANITIES,
  kind: 'item',
  name: 'Lavatório de coluna',
  tags: ['lavatório', 'pia', 'cuba', 'coluna', 'louça', 'banheiro', 'lavabo'],
  defaults: { width: 50, depth: 43, height: 85, params: {} },
  limits: { minWidth: 40, maxWidth: 65, minDepth: 35, maxDepth: 55, minHeight: 75, maxHeight: 95 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: Math.min(10, d / 3) },
    ellipse(0, 3, w / 2 - 6, d / 2 - 9, { fill: 'soft', thin: true }),
    drain(0, 3),
    faucetDot(0, -d / 2 + 4),
  ],
  model: ({ width: w, depth: d, height: h }) => [
    { x: 0, y: (h - 16) / 2, z: -d / 2 + 10, w: w * 0.32, h: h - 16, d: 16, mat: 'porcelain' },
    { x: 0, y: h - 8, z: 0, w, h: 16, d, mat: 'porcelain' },
    { x: 0, y: h + 0.1, z: 3, w: w - 12, h: 0.4, d: d - 18, mat: 'sheet' },
    ...faucet(0, h, -d / 2 + 4),
  ],
}

const BASINS: ParamField = {
  key: 'basins',
  label: 'Cuba',
  type: 'select',
  options: [
    { value: 1, label: 'Uma' },
    { value: 2, label: 'Duas' },
  ],
}

/** Duas cubas só em gabinetes a partir de 100 cm. */
const basinCount = (w: number, params: Record<string, unknown>) => (params.basins === 2 && w >= 100 ? 2 : 1)
const basinXs = (w: number, n: number) => (n === 1 ? [0] : [-w / 4, w / 4])

const PLINTH = 10
const TOP = 3

export const vanity: ItemDef = {
  id: 'bathroom.vanity',
  category: 'bathroom',
  group: VANITIES,
  kind: 'item',
  name: 'Gabinete com cuba',
  tags: ['gabinete', 'lavatório', 'pia', 'cuba', 'bancada', 'banheiro', 'armário'],
  defaults: { width: 60, depth: 45, height: 85, params: { basins: 1 } },
  presets: widths([50, 60, 80, 100, 120], 45),
  limits: { minWidth: 40, maxWidth: 200, minDepth: 35, maxDepth: 60, minHeight: 70, maxHeight: 95 },
  againstWall: true,
  paramsSchema: [BASINS],
  symbol: ({ width: w, depth: d, params }) => {
    const n = basinCount(w, params)
    const rx = Math.min(22, (w / n - 12) / 2)
    return [
      { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid' },
      { t: 'line', pts: [-w / 2, d / 2 - 3, w / 2, d / 2 - 3], thin: true },
      ...basinXs(w, n).flatMap((x) => [ellipse(x, 2, rx, Math.min(16, d / 2 - 8), { fill: 'soft', thin: true }), drain(x, 2), faucetDot(x, -d / 2 + 4)]),
    ]
  },
  model: ({ width: w, depth: d, height: h, params }) => {
    const n = basinCount(w, params)
    const body = h - TOP
    const doors = Math.max(1, Math.round(w / 50))
    const dw = w / doors
    const boxes: Box3[] = [
      { x: 0, y: PLINTH / 2, z: -2, w: w - 2, h: PLINTH, d: d - 8, mat: 'dark' },
      { x: 0, y: (PLINTH + body) / 2, z: -1.5, w, h: body - PLINTH, d: d - 5, mat: 'cabinet' },
      { x: 0, y: h - TOP / 2, z: 0, w, h: TOP, d, mat: 'stone' },
    ]
    for (let i = 0; i < doors; i++) {
      const x = -w / 2 + (i + 0.5) * dw
      boxes.push({ x, y: (PLINTH + body) / 2, z: d / 2 - 3.5, w: dw - 0.6, h: body - PLINTH - 0.6, d: 1.8, mat: 'cabinet' })
      boxes.push({ x: doors === 1 ? x + dw / 2 - 5 : i % 2 === 0 ? x + dw / 2 - 4 : x - dw / 2 + 4, y: body - 10, z: d / 2 - 2, w: 1.2, h: 12, d: 1.2, mat: 'metal' })
    }
    const bw = Math.min(44, w / n - 12)
    for (const x of basinXs(w, n)) {
      boxes.push({ x, y: h + 0.2, z: 2, w: bw, h: 0.6, d: Math.min(32, d - 14), mat: 'porcelain' })
      boxes.push(...faucet(x, h, -d / 2 + 4))
    }
    return boxes
  },
}

// ---------------------------------------------------------------------------------------------
// Box e banheira

const LAYOUT: ParamField = {
  key: 'layout',
  label: 'Vidro',
  type: 'select',
  options: [
    { value: 'front', label: 'Só na frente (entre paredes)' },
    { value: 'corner', label: 'Frente e lateral (de canto)' },
  ],
}

export const shower: ItemDef = {
  id: 'bathroom.shower',
  category: 'bathroom',
  group: BATH,
  kind: 'item',
  name: 'Box de chuveiro',
  tags: ['box', 'chuveiro', 'ducha', 'vidro', 'banho', 'banheiro'],
  defaults: { width: 90, depth: 90, height: 190, params: { layout: 'front' } },
  presets: sizes([
    [80, 80],
    [90, 90],
    [80, 120],
    [90, 140],
  ]),
  limits: { minWidth: 70, maxWidth: 200, minDepth: 70, maxDepth: 200, minHeight: 180, maxHeight: 220 },
  againstWall: true,
  paramsSchema: [LAYOUT],
  symbol: ({ width: w, depth: d, params }) => {
    const corner = params.layout === 'corner'
    const g = 1.5
    return [
      // área do banho: contorno fino e diagonal, como na convenção de desenho
      { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, thin: true },
      { t: 'line', pts: [-w / 2, -d / 2, w / 2, d / 2], thin: true, dash: true },
      { t: 'circle', cx: 0, cy: 0, r: 4, thin: true },
      { t: 'circle', cx: 0, cy: 0, r: 1.5, thin: true },
      // vidro: frente (e lateral direita, se de canto)
      { t: 'rect', x: -w / 2, y: d / 2 - g, w, h: g, fill: 'glass', thin: true },
      ...(corner ? [{ t: 'rect', x: w / 2 - g, y: -d / 2, w: g, h: d, fill: 'glass', thin: true } as Prim] : []),
      // chuveiro na parede do fundo
      { t: 'circle', cx: 0, cy: -d / 2 + 6, r: 5, fill: 'steel', thin: true },
    ]
  },
  model: ({ width: w, depth: d, height: h, params }) => {
    const corner = params.layout === 'corner'
    const boxes: Box3[] = [
      { x: 0, y: h / 2 + 1, z: d / 2 - 0.5, w, h, d: 1, mat: 'glass' },
      { x: 0, y: h + 1.5, z: d / 2 - 0.5, w, h: 2, d: 2, mat: 'steel' },
      // ralo e chuveiro
      { x: 0, y: 0.6, z: 0, w: 10, h: 0.4, d: 10, mat: 'steel' },
      { x: 0, y: h + 10, z: -d / 2 + 2, w: 2, h: 30, d: 0, mat: 'metal', shape: 'cylinder' },
      { x: 0, y: h + 24, z: -d / 2 + 14, w: 2, h: 2, d: 22, mat: 'metal' },
      { x: 0, y: h + 22, z: -d / 2 + 24, w: 20, h: 2, d: 0, mat: 'steel', shape: 'cylinder' },
    ]
    if (corner) {
      boxes.push({ x: w / 2 - 0.5, y: h / 2 + 1, z: 0, w: 1, h, d, mat: 'glass' })
      boxes.push({ x: w / 2 - 0.5, y: h + 1.5, z: 0, w: 2, h: 2, d, mat: 'steel' })
    }
    return boxes
  },
}

export const bathtub: ItemDef = {
  id: 'bathroom.bathtub',
  category: 'bathroom',
  group: BATH,
  kind: 'item',
  name: 'Banheira',
  tags: ['banheira', 'banho', 'imersão', 'banheiro'],
  defaults: { width: 170, depth: 70, height: 55, params: {} },
  presets: sizes([
    [150, 70],
    [160, 70],
    [170, 70],
    [170, 75],
    [180, 80],
  ]),
  limits: { minWidth: 120, maxWidth: 200, minDepth: 60, maxDepth: 100, minHeight: 40, maxHeight: 65 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => {
    const rim = Math.min(8, d / 8)
    return [
      { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 4 },
      { t: 'rect', x: -w / 2 + rim, y: -d / 2 + rim, w: w - 2 * rim, h: d - 2 * rim, fill: 'soft', r: Math.min(22, (d - 2 * rim) / 2), thin: true },
      drain(-w / 2 + rim + 12, 0),
      faucetDot(-w / 2 + rim / 2 + 2, -d / 2 + rim / 2 + 2),
    ]
  },
  model: ({ width: w, depth: d, height: h }) => {
    const rim = Math.min(8, d / 8)
    return [
      { x: 0, y: h / 2, z: 0, w, h, d, mat: 'porcelain' },
      // fundo da banheira, um pouco abaixo da borda (visto de cima, marca a parte interna)
      { x: 0, y: h + 0.1, z: 0, w: w - 2 * rim, h: 0.4, d: d - 2 * rim, mat: 'sheet' },
      ...faucet(-w / 2 + rim / 2 + 2, h, -d / 2 + rim / 2 + 2, 10),
    ]
  },
}

export const BATHROOM: ItemDef[] = [toiletTank, toiletWallHung, bidet, pedestalSink, vanity, shower, bathtub]
