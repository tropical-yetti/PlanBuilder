import type { Box3, ItemDef, Prim } from '../../types'

const GROUP = 'Camas'
const MATTRESS_TOP = 52
const HEADBOARD = 6

/** Tamanhos padrão de colchão no Brasil (largura × comprimento, em cm). A cama ocupa a medida do colchão. */
export const BED_SIZES = [
  { id: 'single', name: 'Cama de solteiro', width: 88, depth: 188, tags: ['solteiro'] },
  { id: 'single-xl', name: 'Cama de solteirão', width: 96, depth: 203, tags: ['solteirão', 'solteiro king'] },
  { id: 'widow', name: 'Cama viúva', width: 128, depth: 188, tags: ['viúva', 'viuva'] },
  { id: 'double', name: 'Cama de casal', width: 138, depth: 188, tags: ['casal', 'padrão'] },
  { id: 'queen', name: 'Cama queen', width: 158, depth: 198, tags: ['queen', 'casal'] },
  { id: 'king', name: 'Cama king', width: 193, depth: 203, tags: ['king', 'casal'] },
] as const

const pillowsFor = (w: number) => (w >= 110 ? 2 : 1)

function bedSymbol(w: number, d: number): Prim[] {
  const n = pillowsFor(w)
  const margin = 8
  const gap = 6
  const pw = (w - 2 * margin - (n - 1) * gap) / n
  const fold = -d / 2 + HEADBOARD + Math.min(60, d * 0.3)
  const prims: Prim[] = [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 2 },
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: HEADBOARD, fill: 'wood' },
  ]
  for (let i = 0; i < n; i++) prims.push({ t: 'rect', x: -w / 2 + margin + i * (pw + gap), y: -d / 2 + HEADBOARD + 6, w: pw, h: 34, fill: 'soft', r: 8, thin: true })
  // cobertor dobrado na altura do travesseiro
  prims.push({ t: 'rect', x: -w / 2 + 2, y: fold, w: w - 4, h: d / 2 - fold - 2, fill: 'soft', r: 2, thin: true })
  prims.push({ t: 'line', pts: [-w / 2 + 2, fold + 12, w / 2 - 2, fold + 12], thin: true })
  return prims
}

function bedModel(w: number, d: number, h: number): Box3[] {
  const n = pillowsFor(w)
  const margin = 8
  const gap = 6
  const pw = (w - 2 * margin - (n - 1) * gap) / n
  const fold = -d / 2 + HEADBOARD + Math.min(60, d * 0.3)
  const boxes: Box3[] = [
    { x: 0, y: 15, z: HEADBOARD / 2, w, h: 30, d: d - HEADBOARD, mat: 'wood' },
    { x: 0, y: 30 + (MATTRESS_TOP - 30) / 2, z: HEADBOARD / 2, w: w - 2, h: MATTRESS_TOP - 30, d: d - HEADBOARD - 2, mat: 'sheet' },
    { x: 0, y: h / 2, z: -d / 2 + HEADBOARD / 2, w, h, d: HEADBOARD, mat: 'wood' },
    { x: 0, y: MATTRESS_TOP + 3, z: (fold + d / 2) / 2, w: w - 2, h: 6, d: d / 2 - fold - 2, mat: 'cushion' },
  ]
  for (let i = 0; i < n; i++) {
    boxes.push({ x: -w / 2 + margin + i * (pw + gap) + pw / 2, y: MATTRESS_TOP + 6, z: -d / 2 + HEADBOARD + 6 + 17, w: pw, h: 12, d: 34, mat: 'pillow' })
  }
  return boxes
}

export const BEDS: ItemDef[] = BED_SIZES.map((size) => ({
  id: `furniture.bed-${size.id}`,
  category: 'furniture',
  group: GROUP,
  kind: 'item',
  name: size.name,
  tags: ['cama', 'quarto', 'dormir', 'colchão', 'box', ...size.tags],
  defaults: { width: size.width, depth: size.depth, height: 100, params: {} },
  limits: { minWidth: 60, maxWidth: 240, minDepth: 120, maxDepth: 240, minHeight: 40, maxHeight: 160 },
  againstWall: true,
  symbol: ({ width, depth }) => bedSymbol(width, depth),
  model: ({ width, depth, height }) => bedModel(width, depth, height),
}))
