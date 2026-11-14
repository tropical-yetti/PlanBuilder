import type { Box3, ItemDef, Prim } from '../../types'

/**
 * Lavanderia, modelos Brastemp (largura × profundidade × altura, cm):
 * - Máquina de lavar de abertura superior 12 kg BWR12BB e 15 kg BWF15AB: 63 × 71 × 106
 * - Lava e seca de abertura frontal 11 kg BNO11AS: 59,5 × 64,4 × 84,6
 */

const GROUP = 'Lavanderia'

function topLoadSymbol(w: number, d: number): Prim[] {
  const panel = Math.min(14, d * 0.2)
  const r = Math.min(w, d - panel) * 0.36
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 3 },
    // painel de comandos no fundo
    { t: 'rect', x: -w / 2 + 2, y: -d / 2 + 2, w: w - 4, h: panel, fill: 'soft', r: 2, thin: true },
    // tampa e cesto
    { t: 'circle', cx: 0, cy: -d / 2 + panel + (d - panel) / 2, r, fill: 'soft', thin: true },
    { t: 'circle', cx: 0, cy: -d / 2 + panel + (d - panel) / 2, r: r * 0.7, thin: true },
  ]
}

function frontLoadSymbol(w: number, d: number): Prim[] {
  const panel = Math.min(12, d * 0.18)
  const door = w * 0.32
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 3 },
    { t: 'rect', x: -w / 2 + 2, y: -d / 2 + 2, w: w - 4, h: panel, fill: 'soft', r: 2, thin: true },
    // porta frontal: giro tracejado, para conferir o espaço na frente
    { t: 'line', pts: [-door, d / 2, door, d / 2], thin: false },
    { t: 'arc', cx: -door, cy: d / 2, r: door * 2, a0: 0, a1: Math.PI / 2, dash: true, thin: true },
  ]
}

function topLoadModel(w: number, d: number, h: number): Box3[] {
  const panel = Math.min(14, d * 0.2)
  const body = h - 12
  return [
    { x: 0, y: body / 2, z: 0, w, h: body, d, mat: 'enamel' },
    // painel de comandos inclinado no fundo (aproximado por um bloco)
    { x: 0, y: body + 6, z: -d / 2 + panel / 2, w, h: 12, d: panel, mat: 'enamel' },
    // tampa transparente
    { x: 0, y: body + 0.6, z: panel / 2, w: w * 0.75, h: 1.2, d: (d - panel) * 0.8, mat: 'glass' },
  ]
}

function frontLoadModel(w: number, d: number, h: number): Box3[] {
  return [
    { x: 0, y: h / 2, z: 0, w, h, d, mat: 'enamel' },
    { x: 0, y: h - 6, z: d / 2 + 0.3, w: w - 4, h: 10, d: 0.6, mat: 'dark' },
    // porta redonda (vista de frente como um quadrado de vidro escuro)
    { x: 0, y: h * 0.5, z: d / 2 + 0.8, w: w * 0.6, h: w * 0.6, d: 1.5, mat: 'dark' },
  ]
}

const limits = { minWidth: 45, maxWidth: 90, minDepth: 45, maxDepth: 90, minHeight: 70, maxHeight: 130 }

export const washerTop: ItemDef = {
  id: 'appliance.washer-top',
  category: 'appliances',
  group: GROUP,
  kind: 'item',
  name: 'Máquina de lavar',
  tags: ['máquina de lavar', 'lavadora', 'lavar roupa', 'área de serviço', 'lavanderia', 'abertura superior', '12 kg', '15 kg', 'brastemp', 'BWR12', 'BWF15'],
  defaults: { width: 63, depth: 71, height: 106, params: {} },
  limits,
  againstWall: true,
  symbol: ({ width: w, depth: d }) => topLoadSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => topLoadModel(w, d, h),
}

export const washerFront: ItemDef = {
  id: 'appliance.washer-front',
  category: 'appliances',
  group: GROUP,
  kind: 'item',
  name: 'Lava e seca',
  tags: ['lava e seca', 'máquina de lavar', 'lavadora', 'secadora', 'lavar roupa', 'área de serviço', 'lavanderia', 'abertura frontal', '11 kg', 'brastemp', 'BNO11'],
  defaults: { width: 59.5, depth: 64.4, height: 84.6, params: {} },
  limits,
  againstWall: true,
  symbol: ({ width: w, depth: d }) => frontLoadSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => frontLoadModel(w, d, h),
}
