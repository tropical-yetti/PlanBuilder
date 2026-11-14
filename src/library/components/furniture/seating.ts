import type { Box3, ItemDef, ItemPreset, Prim } from '../../types'

const GROUP = 'Sofás e poltronas'
const SEAT_TOP = 42
const ARM_TOP = 62

const preset = (width: number, depth: number): ItemPreset => ({ label: `${width} × ${depth}`, width, depth })

/** Medidas que se adaptam ao tamanho: braços e encosto proporcionais, com limites. */
function parts(w: number, d: number) {
  return { arm: Math.min(18, w * 0.14), back: Math.min(22, d * 0.26) }
}

function seatingSymbol(w: number, d: number, seats: number): Prim[] {
  const { arm, back } = parts(w, d)
  const inner = w - 2 * arm
  const cushion = inner / seats
  const prims: Prim[] = [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 4 },
    { t: 'rect', x: -w / 2 + arm, y: -d / 2, w: inner, h: back, fill: 'soft', r: 2 },
    { t: 'rect', x: -w / 2, y: -d / 2, w: arm, h: d, fill: 'soft', r: 4 },
    { t: 'rect', x: w / 2 - arm, y: -d / 2, w: arm, h: d, fill: 'soft', r: 4 },
  ]
  for (let i = 0; i < seats; i++) {
    prims.push({ t: 'rect', x: -w / 2 + arm + i * cushion + 1, y: -d / 2 + back + 1, w: cushion - 2, h: d - back - 4, fill: 'solid', r: 4, thin: true })
  }
  return prims
}

function seatingModel(w: number, d: number, h: number, seats: number): Box3[] {
  const { arm, back } = parts(w, d)
  const inner = w - 2 * arm
  const cushion = inner / seats
  const baseTop = SEAT_TOP - 10
  const boxes: Box3[] = [
    { x: 0, y: baseTop / 2, z: 0, w, h: baseTop, d, mat: 'fabric' },
    { x: 0, y: (baseTop + h) / 2, z: -d / 2 + back / 2, w: inner, h: h - baseTop, d: back, mat: 'fabric' },
    { x: -w / 2 + arm / 2, y: ARM_TOP / 2, z: 0, w: arm, h: ARM_TOP, d, mat: 'fabric' },
    { x: w / 2 - arm / 2, y: ARM_TOP / 2, z: 0, w: arm, h: ARM_TOP, d, mat: 'fabric' },
  ]
  for (let i = 0; i < seats; i++) {
    boxes.push({ x: -w / 2 + arm + (i + 0.5) * cushion, y: baseTop + 5, z: back / 2 - 2, w: cushion - 2, h: 10, d: d - back - 4, mat: 'cushion' })
  }
  return boxes
}

function seating(id: string, name: string, seats: number, tags: string[], presets: ItemPreset[], def: { width: number; depth: number }): ItemDef {
  return {
    id,
    category: 'furniture',
    group: GROUP,
    kind: 'item',
    name,
    tags: [...tags, 'sala', 'estar', 'assento', 'estofado'],
    defaults: { width: def.width, depth: def.depth, height: 85, params: {} },
    presets,
    limits: { minWidth: 50, maxWidth: 350, minDepth: 50, maxDepth: 130, minHeight: 60, maxHeight: 120 },
    againstWall: true,
    symbol: ({ width, depth }) => seatingSymbol(width, depth, seats),
    model: ({ width, depth, height }) => seatingModel(width, depth, height, seats),
  }
}

export const sofa2 = seating('furniture.sofa-2', 'Sofá de 2 lugares', 2, ['sofá', 'sofa', 'dois lugares', '2 lugares'], [preset(140, 85), preset(150, 90), preset(170, 95)], { width: 150, depth: 90 })
export const sofa3 = seating('furniture.sofa-3', 'Sofá de 3 lugares', 3, ['sofá', 'sofa', 'três lugares', '3 lugares'], [preset(190, 90), preset(210, 90), preset(230, 95)], { width: 210, depth: 90 })
export const armchair = seating('furniture.armchair', 'Poltrona', 1, ['poltrona', 'cadeira', 'leitura'], [preset(70, 75), preset(80, 80), preset(90, 85)], { width: 80, depth: 80 })
