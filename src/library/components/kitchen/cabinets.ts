import { ELEVATION_PARAM, type Box3, type ItemDef, type ItemPreset, type ParamField, type Prim } from '../../types'

/**
 * Gabinetes e armários de cozinha e lavanderia, com medidas de mercado:
 * - bancada a 90 cm do piso (com o tampo), profundidade de 60 cm;
 * - gabinete de pia de 80 a 150 cm (1,20 m e 1,50 m são os mais comuns);
 * - armário aéreo com 35 cm de profundidade, a 150 cm do piso (60 cm livres acima da bancada).
 */

const KITCHEN = 'Gabinetes de cozinha'
const LAUNDRY = 'Gabinetes de lavanderia'
const TOP = 4 // espessura do tampo
const PLINTH = 10 // rodapé recuado

const widths = (list: number[], depth: number): ItemPreset[] => list.map((w) => ({ label: `${w} cm`, width: w, depth }))

/** Quantidade de portas de um gabinete com essa largura (portas de até ~50 cm). */
const doorsFor = (w: number) => Math.max(1, Math.round(w / 50))

// ---------------------------------------------------------------------------------------------
// Planta

/** Contorno do gabinete com a linha da frente das portas. */
function baseSymbol(w: number, d: number): Prim[] {
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid' },
    { t: 'line', pts: [-w / 2, d / 2 - 3, w / 2, d / 2 - 3], thin: true },
  ]
}

/** Cubas: retângulos de inox com o ralo; a torneira fica no fundo. */
function basins(d: number, count: 1 | 2, bw: number, bd: number): Prim[] {
  const prims: Prim[] = []
  const y = -d / 2 + 10
  const gap = 6
  const total = count * bw + (count - 1) * gap
  for (let i = 0; i < count; i++) {
    const x = -total / 2 + i * (bw + gap)
    prims.push({ t: 'rect', x, y, w: bw, h: bd, fill: 'steel', r: 4, thin: true })
    prims.push({ t: 'circle', cx: x + bw / 2, cy: y + bd / 2, r: 2.5, thin: true })
  }
  prims.push({ t: 'circle', cx: 0, cy: -d / 2 + 5, r: 2, fill: 'steel', thin: true })
  return prims
}

/** Armário aéreo: tracejado, como manda a convenção para elementos acima do plano de corte. */
function wallCabinetSymbol(w: number, d: number): Prim[] {
  const x0 = -w / 2
  const y0 = -d / 2
  return [
    { t: 'line', pts: [x0, y0, x0 + w, y0, x0 + w, y0 + d, x0, y0 + d], closed: true, dash: true, thin: true },
    { t: 'line', pts: [x0, y0, x0 + w, y0 + d], dash: true, thin: true },
    { t: 'line', pts: [x0 + w, y0, x0, y0 + d], dash: true, thin: true },
  ]
}

/** Armário alto (do piso ao teto): contorno cheio com um X. */
function tallSymbol(w: number, d: number): Prim[] {
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid' },
    { t: 'line', pts: [-w / 2, -d / 2, w / 2, d / 2], thin: true },
    { t: 'line', pts: [w / 2, -d / 2, -w / 2, d / 2], thin: true },
  ]
}

// ---------------------------------------------------------------------------------------------
// 3D

/** Frentes de porta com puxador, de `y0` a `y1`, no plano da frente (`z`). */
function doors(w: number, y0: number, y1: number, z: number, count: number): Box3[] {
  const boxes: Box3[] = []
  const dw = w / count
  for (let i = 0; i < count; i++) {
    const x = -w / 2 + (i + 0.5) * dw
    boxes.push({ x, y: (y0 + y1) / 2, z, w: dw - 0.6, h: y1 - y0 - 0.6, d: 1.8, mat: 'cabinet' })
    // puxador perto do encontro das portas (ou da borda, numa porta só)
    const hx = count === 1 ? x + dw / 2 - 5 : i % 2 === 0 ? x + dw / 2 - 4 : x - dw / 2 + 4
    boxes.push({ x: hx, y: y1 - 10, z: z + 1.5, w: 1.2, h: 12, d: 1.2, mat: 'metal' })
  }
  return boxes
}

function baseModel(w: number, d: number, h: number, extras: Box3[] = []): Box3[] {
  const body = h - TOP
  return [
    { x: 0, y: PLINTH / 2, z: -2, w: w - 2, h: PLINTH, d: d - 8, mat: 'dark' },
    { x: 0, y: (PLINTH + body) / 2, z: -1.5, w, h: body - PLINTH, d: d - 5, mat: 'cabinet' },
    ...doors(w, PLINTH, body, d / 2 - 3.5, doorsFor(w)),
    { x: 0, y: h - TOP / 2, z: 0, w, h: TOP, d, mat: 'stone' },
    ...extras,
  ]
}

function sinkExtras(d: number, h: number, count: 1 | 2, bw: number, bd: number): Box3[] {
  const gap = 6
  const total = count * bw + (count - 1) * gap
  const boxes: Box3[] = []
  for (let i = 0; i < count; i++) {
    const x = -total / 2 + i * (bw + gap) + bw / 2
    boxes.push({ x, y: h + 0.3, z: -d / 2 + 10 + bd / 2, w: bw, h: 0.6, d: bd, mat: 'steel' })
    boxes.push({ x, y: h + 0.4, z: -d / 2 + 10 + bd / 2, w: bw - 6, h: 0.6, d: bd - 6, mat: 'dark' })
  }
  // torneira: coluna e bica
  boxes.push({ x: 0, y: h + 15, z: -d / 2 + 5, w: 3, h: 30, d: 0, mat: 'metal', shape: 'cylinder' })
  boxes.push({ x: 0, y: h + 29, z: -d / 2 + 14, w: 2.4, h: 2.4, d: 18, mat: 'metal' })
  return boxes
}

function wallCabinetModel(w: number, d: number, h: number): Box3[] {
  return [{ x: 0, y: h / 2, z: -1, w, h, d: d - 2, mat: 'cabinet' }, ...doors(w, 0, h, d / 2 - 1, doorsFor(w))]
}

// ---------------------------------------------------------------------------------------------

const ELEVATION: ParamField = { key: ELEVATION_PARAM, label: 'Altura do piso', type: 'number', min: 0, max: 250, suffix: 'cm' }
const BASIN: ParamField = {
  key: 'basins',
  label: 'Cuba',
  type: 'select',
  options: [
    { value: 1, label: 'Simples' },
    { value: 2, label: 'Dupla' },
  ],
}

const baseLimits = { minWidth: 30, maxWidth: 300, minDepth: 40, maxDepth: 80, minHeight: 70, maxHeight: 100 }
const wallLimits = { minWidth: 30, maxWidth: 300, minDepth: 20, maxDepth: 50, minHeight: 30, maxHeight: 120 }

export const sinkCabinet: ItemDef = {
  id: 'kitchen.sink-cabinet',
  category: 'kitchen',
  group: KITCHEN,
  kind: 'item',
  name: 'Gabinete de pia',
  tags: ['gabinete', 'pia', 'cuba', 'bancada', 'cozinha', 'armário', 'balcão'],
  defaults: { width: 120, depth: 60, height: 90, params: { basins: 1 } },
  presets: widths([80, 100, 120, 150, 180], 60),
  limits: { ...baseLimits, minWidth: 60 },
  againstWall: true,
  paramsSchema: [BASIN],
  symbol: ({ width: w, depth: d, params }) => {
    const n = params.basins === 2 && w >= 100 ? 2 : 1
    return [...baseSymbol(w, d), ...basins(d, n, n === 2 ? 36 : Math.min(50, w - 20), Math.min(40, d - 16))]
  },
  model: ({ width: w, depth: d, height: h, params }) => {
    const n = params.basins === 2 && w >= 100 ? 2 : 1
    return baseModel(w, d, h, sinkExtras(d, h, n, n === 2 ? 36 : Math.min(50, w - 20), Math.min(40, d - 16)))
  },
}

export const baseCabinet: ItemDef = {
  id: 'kitchen.base-cabinet',
  category: 'kitchen',
  group: KITCHEN,
  kind: 'item',
  name: 'Balcão',
  tags: ['balcão', 'gabinete', 'armário', 'bancada', 'cozinha', 'inferior', 'gaveteiro'],
  defaults: { width: 80, depth: 60, height: 90, params: {} },
  presets: widths([40, 60, 80, 100, 120], 60),
  limits: baseLimits,
  againstWall: true,
  symbol: ({ width: w, depth: d }) => baseSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => baseModel(w, d, h),
}

function wallCabinet(id: string, group: string, name: string, tags: string[], def: { width: number; height: number; elevation: number }): ItemDef {
  return {
    id,
    category: 'kitchen',
    group,
    kind: 'item',
    name,
    tags: ['armário aéreo', 'aéreo', 'armário', 'suspenso', 'superior', ...tags],
    defaults: { width: def.width, depth: 35, height: def.height, params: { [ELEVATION_PARAM]: def.elevation } },
    presets: widths([40, 60, 80, 100, 120], 35),
    limits: wallLimits,
    againstWall: true,
    paramsSchema: [ELEVATION],
    symbol: ({ width: w, depth: d }) => wallCabinetSymbol(w, d),
    model: ({ width: w, depth: d, height: h }) => wallCabinetModel(w, d, h),
  }
}

export const kitchenWallCabinet = wallCabinet('kitchen.wall-cabinet', KITCHEN, 'Armário aéreo', ['cozinha'], { width: 80, height: 70, elevation: 150 })

/** Tanque visto de cima: cuba com esfregador, ralo e torneira no fundo. */
function tankSymbol(w: number, d: number): Prim[] {
  const bw = Math.min(w - 10, 46)
  const bd = Math.min(d - 12, 34)
  const x = -bw / 2
  const y = -d / 2 + 6
  const ribs: Prim[] = [0.55, 0.7, 0.85].map((f) => ({ t: 'line', pts: [x + 4, y + bd * f, x + bw - 4, y + bd * f], thin: true }))
  return [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid', r: 2 },
    { t: 'rect', x, y, w: bw, h: bd, fill: 'soft', r: 4, thin: true },
    // esfregador (ranhuras na frente da cuba)
    ...ribs,
    { t: 'circle', cx: 0, cy: y + bd * 0.3, r: 2.5, thin: true },
    { t: 'circle', cx: 0, cy: -d / 2 + 3, r: 2, fill: 'steel', thin: true },
  ]
}

/** Gabinete com o tanque em cima. Sem rodapé quando é suspenso (preso na parede). */
function tankModel(w: number, d: number, h: number, suspended: boolean): Box3[] {
  const tank = 20
  const body = h - tank
  const base = suspended ? 0 : PLINTH
  return [
    ...(suspended ? [] : [{ x: 0, y: PLINTH / 2, z: -2, w: w - 2, h: PLINTH, d: d - 8, mat: 'dark' } as Box3]),
    { x: 0, y: (base + body) / 2, z: -1.5, w, h: body - base, d: d - 5, mat: 'cabinet' },
    ...doors(w, base, body, d / 2 - 3.5, doorsFor(w)),
    { x: 0, y: body + tank / 2, z: 0, w, h: tank, d, mat: 'enamel' },
    { x: 0, y: h + 0.3, z: -d / 2 + 6 + 17, w: Math.min(w - 10, 46), h: 0.6, d: Math.min(d - 12, 34), mat: 'dark' },
    { x: 0, y: h + 12, z: -d / 2 + 3, w: 3, h: 24, d: 0, mat: 'metal', shape: 'cylinder' },
  ]
}

const tankLimits = { minWidth: 40, maxWidth: 150, minDepth: 35, maxDepth: 70, minHeight: 45, maxHeight: 100 }

export const tankCabinet: ItemDef = {
  id: 'laundry.tank-cabinet',
  category: 'kitchen',
  group: LAUNDRY,
  kind: 'item',
  name: 'Gabinete com tanque',
  tags: ['tanque', 'gabinete', 'lavanderia', 'área de serviço', 'esfregador'],
  defaults: { width: 60, depth: 50, height: 90, params: {} },
  presets: widths([50, 60, 80, 100], 50),
  limits: { ...tankLimits, minHeight: 70 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => tankSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => tankModel(w, d, h, false),
}

/**
 * Gabinete suspenso com tanque: preso na parede, sem pés (comum em áreas de serviço pequenas).
 * Medida de mercado: 50 × 40 × 52 cm, com o tanque a 90 cm do piso.
 */
export const suspendedTankCabinet: ItemDef = {
  id: 'laundry.tank-suspended',
  category: 'kitchen',
  group: LAUNDRY,
  kind: 'item',
  name: 'Gabinete suspenso com tanque',
  tags: ['tanque', 'gabinete', 'suspenso', 'lavanderia', 'área de serviço', 'compacto'],
  defaults: { width: 50, depth: 40, height: 52, params: { [ELEVATION_PARAM]: 38 } },
  presets: widths([45, 50, 60], 40),
  limits: tankLimits,
  againstWall: true,
  paramsSchema: [ELEVATION],
  symbol: ({ width: w, depth: d }) => tankSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => tankModel(w, d, h, true),
}

/** Balcão de lavanderia: gabinete inferior sem tanque, mais raso que o da cozinha. */
export const laundryBaseCabinet: ItemDef = {
  id: 'laundry.base-cabinet',
  category: 'kitchen',
  group: LAUNDRY,
  kind: 'item',
  name: 'Balcão de lavanderia',
  tags: ['balcão', 'gabinete', 'lavanderia', 'área de serviço', 'bancada', 'armário inferior'],
  defaults: { width: 80, depth: 50, height: 90, params: {} },
  presets: widths([40, 60, 80, 100, 120], 50),
  limits: baseLimits,
  againstWall: true,
  symbol: ({ width: w, depth: d }) => baseSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => baseModel(w, d, h),
}

/**
 * Gabinete com nicho para máquina: tampo sobre a máquina de abertura frontal (lava e seca),
 * com laterais e o vão livre embaixo. Máquinas de abertura superior não cabem sob tampo.
 */
export const washerNicheCabinet: ItemDef = {
  id: 'laundry.washer-niche',
  category: 'kitchen',
  group: LAUNDRY,
  kind: 'item',
  name: 'Gabinete com nicho para máquina',
  tags: ['nicho', 'máquina', 'lava e seca', 'abertura frontal', 'tampo', 'bancada', 'lavanderia', 'área de serviço'],
  // nicho de 65 cm para a lava e seca de 59,5 cm, com folga de ventilação
  defaults: { width: 70, depth: 65, height: 90, params: {} },
  presets: widths([65, 70, 80], 65),
  limits: { ...baseLimits, minWidth: 60, maxDepth: 75 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => [
    { t: 'rect', x: -w / 2, y: -d / 2, w, h: d, fill: 'solid' },
    // vão da máquina embaixo do tampo, tracejado
    { t: 'line', pts: [-w / 2 + 2, -d / 2 + 2, w / 2 - 2, -d / 2 + 2, w / 2 - 2, d / 2, -w / 2 + 2, d / 2], closed: true, dash: true, thin: true },
    { t: 'circle', cx: 0, cy: 2, r: Math.min(w, d) * 0.28, dash: true, thin: true },
  ],
  model: ({ width: w, depth: d, height: h }) => [
    { x: -w / 2 + 1, y: (h - TOP) / 2, z: 0, w: 2, h: h - TOP, d, mat: 'cabinet' },
    { x: w / 2 - 1, y: (h - TOP) / 2, z: 0, w: 2, h: h - TOP, d, mat: 'cabinet' },
    { x: 0, y: h - TOP / 2, z: 0, w, h: TOP, d, mat: 'stone' },
  ],
}

export const laundryWallCabinet = wallCabinet('laundry.wall-cabinet', LAUNDRY, 'Armário aéreo de lavanderia', ['lavanderia', 'área de serviço'], {
  width: 80,
  height: 60,
  // acima da máquina de lavar (106 cm) com folga para abrir a tampa
  elevation: 160,
})

export const tallCabinet: ItemDef = {
  id: 'laundry.tall-cabinet',
  category: 'kitchen',
  group: LAUNDRY,
  kind: 'item',
  name: 'Armário alto',
  tags: ['armário alto', 'vassoureiro', 'despensa', 'paneleiro', 'lavanderia', 'área de serviço', 'cozinha'],
  defaults: { width: 60, depth: 50, height: 210, params: {} },
  presets: widths([40, 60, 80], 50),
  limits: { minWidth: 30, maxWidth: 150, minDepth: 30, maxDepth: 70, minHeight: 120, maxHeight: 280 },
  againstWall: true,
  symbol: ({ width: w, depth: d }) => tallSymbol(w, d),
  model: ({ width: w, depth: d, height: h }) => [
    { x: 0, y: PLINTH / 2, z: -2, w: w - 2, h: PLINTH, d: d - 8, mat: 'dark' },
    { x: 0, y: (PLINTH + h) / 2, z: -1, w, h: h - PLINTH, d: d - 2, mat: 'cabinet' },
    ...doors(w, PLINTH, h, d / 2 - 1, Math.max(1, Math.round(w / 45))),
  ],
}
