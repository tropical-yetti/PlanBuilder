import { ELEVATION_PARAM, type Box3, type ItemDef, type Prim } from '../../types'

/**
 * Lava-louças Brastemp (largura × profundidade × altura, cm):
 * - 8 serviços BLF08 (compacta, de bancada): 51 × 65 × 63
 * - 10 serviços BLF10 (slim, de piso): 44,8 × 63,7 × 84,5
 * - 14 serviços BLF14 (de piso): 59,8 × 60 × 84,5
 */

const GROUP = 'Lava-louças'
const PANEL = 4

/** Na planta: o corpo e, tracejada à frente, a porta aberta (ela abre para baixo e ocupa o chão da frente). */
function symbol(w: number, d: number, h: number): Prim[] {
  const door = Math.min(h - 12, 60)
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d - PANEL, fill: 'steel', r: 1 },
    { t: 'rect', x: -w / 2, y: d / 2 - PANEL, w, h: PANEL, fill: 'dark', thin: true },
    { t: 'line', pts: [-w / 2, d / 2, -w / 2, d / 2 + door, w / 2, d / 2 + door, w / 2, d / 2], dash: true, thin: true },
  ]
}

function model(w: number, d: number, h: number): Box3[] {
  return [
    { x: 0, y: h / 2, z: -PANEL / 2, w, h, d: d - PANEL, mat: 'steel' },
    // porta com o painel de controle no alto
    { x: 0, y: (h - 10) / 2, z: d / 2 - PANEL / 2, w: w - 0.6, h: h - 10, d: PANEL, mat: 'steel' },
    { x: 0, y: h - 5, z: d / 2 - PANEL / 2, w: w - 0.6, h: 10, d: PANEL, mat: 'dark' },
    { x: 0, y: h - 14, z: d / 2 + 1.5, w: w * 0.5, h: 2, d: 2, mat: 'metal' },
  ]
}

function dishwasher(services: 8 | 10 | 14, width: number, depth: number, height: number, model3d: string, extra: { countertop?: boolean; tags: string[] }): ItemDef {
  return {
    id: `appliance.dishwasher-${services}`,
    category: 'appliances',
    group: GROUP,
    kind: 'item',
    name: `Lava-louças ${services} serviços`,
    tags: ['lava-louças', 'lava louças', 'lavalouças', 'cozinha', `${services} serviços`, 'brastemp', model3d, ...extra.tags],
    // a compacta fica sobre a bancada (90 cm)
    defaults: { width, depth, height, params: extra.countertop ? { [ELEVATION_PARAM]: 90 } : {} },
    limits: { minWidth: 40, maxWidth: 70, minDepth: 45, maxDepth: 75, minHeight: 40, maxHeight: 95 },
    againstWall: true,
    paramsSchema: extra.countertop ? [{ key: ELEVATION_PARAM, label: 'Altura do piso', type: 'number', min: 0, max: 150, suffix: 'cm' }] : undefined,
    symbol: ({ width: w, depth: d }) => symbol(w, d, height),
    model: ({ width: w, depth: d, height: h }) => model(w, d, h),
  }
}

export const dishwasher8 = dishwasher(8, 51, 65, 63, 'BLF08', { countertop: true, tags: ['compacta', 'de bancada'] })
export const dishwasher10 = dishwasher(10, 44.8, 63.7, 84.5, 'BLF10', { tags: ['slim', '45 cm', 'de piso'] })
export const dishwasher14 = dishwasher(14, 59.8, 60, 84.5, 'BLF14', { tags: ['60 cm', 'de piso'] })
