import { CATEGORIES, type CategoryId } from './categories'
import { dishwasher10, dishwasher14, dishwasher8 } from './components/appliances/dishwashers'
import { fridgeDuplex, fridgeInverse, fridgeSide } from './components/appliances/fridges'
import { stove4, stove5, stove6 } from './components/appliances/stoves'
import { washerFront, washerTop } from './components/appliances/washers'
import { cobogoBand } from './components/cobogo/band'
import { cobogoPanel } from './components/cobogo/panel'
import { doorFolding } from './components/doors/folding'
import { doorOpenPassage } from './components/doors/open-passage'
import { doorSliding } from './components/doors/sliding'
import { doorSwingDouble } from './components/doors/swing-double'
import { doorSwingSingle } from './components/doors/swing-single'
import { BEDS } from './components/furniture/beds'
import { armchair, sofa2, sofa3 } from './components/furniture/seating'
import { baseCabinet, kitchenWallCabinet, laundryWallCabinet, sinkCabinet, tallCabinet, tankCabinet } from './components/kitchen/cabinets'
import { tableRect, tableRound, tableSquare } from './components/furniture/tables'
import { windowCasement } from './components/windows/casement'
import { windowFixed } from './components/windows/fixed'
import { windowSliding } from './components/windows/sliding'
import { windowTilt } from './components/windows/tilt'
import type { ItemDef, LibraryDef, OpeningDef } from './types'

/** Todos os componentes, na ordem em que aparecem na biblioteca. Componentes novos entram aqui. */
export const COMPONENTS: LibraryDef[] = [
  doorSwingSingle,
  doorSwingDouble,
  doorSliding,
  doorFolding,
  doorOpenPassage,
  windowSliding,
  windowCasement,
  windowTilt,
  windowFixed,
  cobogoPanel,
  cobogoBand,
  sofa2,
  sofa3,
  armchair,
  tableSquare,
  tableRect,
  tableRound,
  ...BEDS,
  sinkCabinet,
  baseCabinet,
  kitchenWallCabinet,
  tankCabinet,
  laundryWallCabinet,
  tallCabinet,
  stove4,
  stove5,
  stove6,
  fridgeDuplex,
  fridgeInverse,
  fridgeSide,
  washerTop,
  washerFront,
  dishwasher8,
  dishwasher10,
  dishwasher14,
]

const byId = new Map<string, LibraryDef>(COMPONENTS.map((c) => [c.id, c]))

/** Usado quando um projeto traz uma porta ou janela que esta versão do app não conhece. */
export const UNKNOWN_COMPONENT: OpeningDef = {
  ...doorOpenPassage,
  id: 'unknown',
  name: 'Componente desconhecido',
  tags: [],
  presets: undefined,
}

/** Usado quando um projeto traz um móvel que esta versão do app não conhece: aparece como uma caixa. */
export const UNKNOWN_ITEM: ItemDef = {
  id: 'unknown-item',
  category: 'furniture',
  group: 'Outros',
  kind: 'item',
  name: 'Objeto desconhecido',
  tags: [],
  defaults: { width: 60, depth: 60, height: 60, params: {} },
  limits: { minWidth: 10, maxWidth: 1000, minDepth: 10, maxDepth: 1000, minHeight: 10, maxHeight: 400 },
  againstWall: false,
  symbol: ({ width, depth }) => [
    { t: 'rect', x: -width / 2, y: -depth / 2, w: width, h: depth, fill: 'solid' },
    { t: 'line', pts: [-width / 2, -depth / 2, width / 2, depth / 2], thin: true },
    { t: 'line', pts: [width / 2, -depth / 2, -width / 2, depth / 2], thin: true },
  ],
  model: ({ width, depth, height }) => [{ x: 0, y: height / 2, z: 0, w: width, h: height, d: depth, mat: 'fabric' }],
}

export const getDef = (id: string): LibraryDef | undefined => byId.get(id)

/** Definição de uma abertura (porta, janela, cobogó). */
export function getComponent(id: string): OpeningDef {
  const d = byId.get(id)
  return d?.kind === 'opening' ? d : UNKNOWN_COMPONENT
}

/** Definição de um móvel. */
export function getItem(id: string): ItemDef {
  const d = byId.get(id)
  return d?.kind === 'item' ? d : UNKNOWN_ITEM
}

export const hasComponent = (id: string): boolean => byId.has(id)
export const listByCategory = (category: CategoryId): LibraryDef[] => COMPONENTS.filter((c) => c.category === category)
export const openingsByCategory = (category: CategoryId): OpeningDef[] =>
  COMPONENTS.filter((c): c is OpeningDef => c.category === category && c.kind === 'opening')
/** Móveis do mesmo subgrupo (para trocar o tipo no painel de propriedades). */
export const itemsInGroup = (group: string): ItemDef[] => COMPONENTS.filter((c): c is ItemDef => c.kind === 'item' && c.group === group)

/** Minúsculas e sem acentos, para a busca ("vao" encontra "Vão livre"). */
export const normalizeText = (s: string): string =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()

/** Busca por nome, palavras-chave e nome da categoria. Todas as palavras digitadas precisam aparecer. */
export function searchComponents(query: string): LibraryDef[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return COMPONENTS
  return COMPONENTS.filter((c) => {
    const cat = CATEGORIES.find((k) => k.id === c.category)?.name ?? ''
    const group = c.kind === 'item' ? c.group : ''
    const hay = normalizeText([c.name, cat, group, ...c.tags].join(' '))
    return words.every((w) => hay.includes(w))
  })
}
