import type { Box3, ItemDef, Prim } from '../../types'

/**
 * Geladeiras Brastemp (largura × profundidade × altura, cm):
 * - Duplex 375 L (freezer em cima) BRM44: 62,1 × 75,5 × 176
 * - Inverse 461 L (freezer embaixo) BRE59FK: 70 × 75,5 × 194,5
 * - Side Inverse 554 L (3 portas, freezer embaixo) BRO85AK: 83,6 × 79,3 × 186,4
 */

const GROUP = 'Geladeiras'
type Kind = 'duplex' | 'inverse' | 'side'

/** Na planta: o corpo, as portas na frente e o giro das portas (tracejado), para conferir o espaço de abrir. */
function fridgeSymbol(w: number, d: number, kind: Kind): Prim[] {
  const door = 5
  const prims: Prim[] = [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d - door, fill: 'steel', r: 1 },
    { t: 'rect', x: -w / 2, y: d / 2 - door, w, h: door, fill: 'soft', thin: true },
  ]
  const front = d / 2
  if (kind === 'side') {
    // duas portas de abrir ao meio (francesas)
    prims.push({ t: 'line', pts: [0, front - door, 0, front], thin: true })
    prims.push({ t: 'arc', cx: -w / 2, cy: front, r: w / 2, a0: 0, a1: Math.PI / 2, dash: true, thin: true })
    prims.push({ t: 'arc', cx: w / 2, cy: front, r: w / 2, a0: Math.PI, a1: Math.PI / 2, dash: true, thin: true })
  } else {
    // uma porta, dobradiça à direita
    prims.push({ t: 'arc', cx: w / 2, cy: front, r: w, a0: Math.PI, a1: Math.PI / 2, dash: true, thin: true })
  }
  return prims
}

function fridgeModel(w: number, d: number, h: number, kind: Kind): Box3[] {
  const door = 5
  const body = d - door
  const boxes: Box3[] = [{ x: 0, y: h / 2, z: -door / 2, w, h, d: body, mat: 'steel' }]
  const doorBox = (x: number, y0: number, y1: number, dw: number): Box3 => ({ x, y: (y0 + y1) / 2, z: d / 2 - door / 2, w: dw - 0.6, h: y1 - y0 - 0.6, d: door, mat: 'steel' })
  const handle = (x: number, y0: number, y1: number): Box3 => ({ x, y: (y0 + y1) / 2, z: d / 2 + 1.5, w: 2, h: y1 - y0, d: 3, mat: 'metal' })
  if (kind === 'duplex') {
    const split = h * 0.7
    boxes.push(doorBox(0, 0, split, w), doorBox(0, split, h, w))
    boxes.push(handle(-w / 2 + 6, split - 50, split - 8), handle(-w / 2 + 6, split + 8, split + 40))
  } else if (kind === 'inverse') {
    const split = h * 0.35
    boxes.push(doorBox(0, 0, split, w), doorBox(0, split, h, w))
    boxes.push(handle(-w / 2 + 6, split + 10, split + 70), { x: 0, y: split - 8, z: d / 2 + 1.5, w: w * 0.5, h: 2, d: 3, mat: 'metal' })
  } else {
    const split = h * 0.33
    boxes.push(doorBox(0, 0, split, w), doorBox(-w / 4, split, h, w / 2), doorBox(w / 4, split, h, w / 2))
    boxes.push(handle(-3, split + 15, split + 85), handle(3, split + 15, split + 85), { x: 0, y: split - 8, z: d / 2 + 1.5, w: w * 0.5, h: 2, d: 3, mat: 'metal' })
  }
  return boxes
}

function fridge(id: string, name: string, kind: Kind, width: number, depth: number, height: number, tags: string[]): ItemDef {
  return {
    id: `appliance.fridge-${id}`,
    category: 'appliances',
    group: GROUP,
    kind: 'item',
    name,
    tags: ['geladeira', 'refrigerador', 'cozinha', 'frost free', 'brastemp', ...tags],
    defaults: { width, depth, height, params: {} },
    limits: { minWidth: 45, maxWidth: 120, minDepth: 50, maxDepth: 95, minHeight: 80, maxHeight: 220 },
    againstWall: true,
    symbol: ({ width: w, depth: d }) => fridgeSymbol(w, d, kind),
    model: ({ width: w, depth: d, height: h }) => fridgeModel(w, d, h, kind),
  }
}

export const fridgeDuplex = fridge('duplex', 'Geladeira duplex', 'duplex', 62.1, 75.5, 176, ['duplex', '375 litros', 'freezer em cima', 'BRM44'])
export const fridgeInverse = fridge('inverse', 'Geladeira inverse', 'inverse', 70, 75.5, 194.5, ['inverse', '461 litros', 'freezer embaixo', 'BRE59'])
export const fridgeSide = fridge('side', 'Geladeira side inverse', 'side', 83.6, 79.3, 186.4, ['side by side', 'side inverse', '3 portas', '554 litros', 'BRO85'])
