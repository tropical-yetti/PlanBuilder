/**
 * Pisos da biblioteca (docs/PLANO.md, seção 11.1).
 *
 * Um piso não é um objeto solto: ele reveste um cômodo inteiro. Cada definição é um ponto de partida
 * (material, paginação, tamanho e cor padrão); no painel do cômodo dá para trocar paginação, tamanho,
 * junta, cor e direção. Para adicionar um piso, inclua uma definição em `FLOORS`.
 */
import type { FloorPattern } from '../model/types'
import { normalizeText } from './registry'

export type FloorMaterial = 'wood' | 'vinyl' | 'ceramic'

export interface FloorSize {
  width: number
  length: number
}

export interface FloorColor {
  label: string
  value: string
}

export interface FloorDef {
  /** Identificador estável, salvo nos projetos. Ex.: "floor.porcelain-60". */
  id: string
  kind: 'floor'
  category: 'floors'
  group: string
  name: string
  tags: string[]
  material: FloorMaterial
  defaults: { pattern: FloorPattern; width: number; length: number; joint: number; color: string }
  /** Paginações oferecidas no painel. */
  patterns: FloorPattern[]
  /** Tamanhos comuns de peça, oferecidos como atalho. */
  sizes: FloorSize[]
  colors: FloorColor[]
}

export const MATERIAL_LABELS: Record<FloorMaterial, string> = {
  wood: 'Madeira',
  vinyl: 'Vinílico',
  ceramic: 'Cerâmica e porcelanato',
}

export const PATTERN_LABELS: Record<FloorPattern, string> = {
  grid: 'Reta',
  stagger: 'Desencontrada',
  diagonal: 'Diagonal',
  herringbone: 'Espinha de peixe',
  basket: 'Tabuleiro',
}

/** Variação de tom entre peças: madeira varia bastante, porcelanato quase nada. */
export const MATERIAL_VARIATION: Record<FloorMaterial, number> = { wood: 0.09, vinyl: 0.05, ceramic: 0.015 }

const WOOD_COLORS: FloorColor[] = [
  { label: 'Claro', value: '#d9b98c' },
  { label: 'Médio', value: '#b98d62' },
  { label: 'Escuro', value: '#7a5236' },
]
const VINYL_COLORS: FloorColor[] = [
  { label: 'Carvalho', value: '#c8a57a' },
  { label: 'Cinza', value: '#a8a29e' },
  { label: 'Nogueira', value: '#8b6a4f' },
]
const CERAMIC_COLORS: FloorColor[] = [
  { label: 'Branco', value: '#f2f0ec' },
  { label: 'Bege', value: '#e3d6c3' },
  { label: 'Cinza', value: '#bfc2c6' },
  { label: 'Grafite', value: '#6b6f75' },
]

const TACO_SIZES: FloorSize[] = [
  { width: 7, length: 35 },
  { width: 10, length: 40 },
  { width: 10, length: 60 },
]
const PLANK_SIZES: FloorSize[] = [
  { width: 15, length: 100 },
  { width: 20, length: 150 },
  { width: 20, length: 200 },
]
const VINYL_PLANK_SIZES: FloorSize[] = [
  { width: 18, length: 120 },
  { width: 20, length: 150 },
  { width: 23, length: 150 },
]
const VINYL_TILE_SIZES: FloorSize[] = [
  { width: 45, length: 45 },
  { width: 60, length: 60 },
  { width: 30, length: 60 },
]
const CERAMIC_SIZES: FloorSize[] = [
  { width: 45, length: 45 },
  { width: 60, length: 60 },
  { width: 90, length: 90 },
  { width: 30, length: 60 },
  { width: 60, length: 120 },
]

const wood = { kind: 'floor', category: 'floors', group: 'Madeira', material: 'wood', colors: WOOD_COLORS } as const
const vinyl = { kind: 'floor', category: 'floors', group: 'Vinílico', material: 'vinyl', colors: VINYL_COLORS } as const
const ceramic = { kind: 'floor', category: 'floors', group: 'Cerâmica e porcelanato', material: 'ceramic', colors: CERAMIC_COLORS } as const

export const FLOORS: FloorDef[] = [
  {
    ...wood,
    id: 'floor.taco-herringbone',
    name: 'Taco espinha de peixe',
    tags: ['parquet', 'taco', 'madeira', 'chevron'],
    defaults: { pattern: 'herringbone', width: 7, length: 35, joint: 0, color: '#b98d62' },
    patterns: ['herringbone', 'basket', 'stagger'],
    sizes: TACO_SIZES,
  },
  {
    ...wood,
    id: 'floor.taco-basket',
    name: 'Taco tabuleiro',
    tags: ['parquet', 'taco', 'madeira', 'xadrez'],
    defaults: { pattern: 'basket', width: 7, length: 35, joint: 0, color: '#d9b98c' },
    patterns: ['basket', 'herringbone', 'stagger'],
    sizes: TACO_SIZES,
  },
  {
    ...wood,
    id: 'floor.wood-planks',
    name: 'Assoalho de réguas',
    tags: ['parquet', 'madeira', 'tábua', 'régua', 'laminado'],
    defaults: { pattern: 'stagger', width: 15, length: 100, joint: 0, color: '#b98d62' },
    patterns: ['stagger', 'grid', 'herringbone'],
    sizes: PLANK_SIZES,
  },
  {
    ...vinyl,
    id: 'floor.vinyl-planks',
    name: 'Vinílico em réguas',
    tags: ['vinil', 'vinilico', 'régua', 'lvt'],
    defaults: { pattern: 'stagger', width: 18, length: 120, joint: 0, color: '#c8a57a' },
    patterns: ['stagger', 'grid', 'herringbone'],
    sizes: VINYL_PLANK_SIZES,
  },
  {
    ...vinyl,
    id: 'floor.vinyl-tiles',
    name: 'Vinílico em placas',
    tags: ['vinil', 'vinilico', 'placa', 'manta'],
    defaults: { pattern: 'grid', width: 60, length: 60, joint: 0, color: '#a8a29e' },
    patterns: ['grid', 'stagger', 'diagonal'],
    sizes: VINYL_TILE_SIZES,
  },
  {
    ...ceramic,
    id: 'floor.porcelain-60',
    name: 'Porcelanato 60 × 60',
    tags: ['cerâmica', 'porcelanato', 'piso frio', 'revestimento'],
    defaults: { pattern: 'grid', width: 60, length: 60, joint: 0.2, color: '#e3d6c3' },
    patterns: ['grid', 'stagger', 'diagonal'],
    sizes: CERAMIC_SIZES,
  },
  {
    ...ceramic,
    id: 'floor.porcelain-120',
    name: 'Porcelanato 60 × 120',
    tags: ['cerâmica', 'porcelanato', 'piso frio', 'grande formato'],
    defaults: { pattern: 'grid', width: 60, length: 120, joint: 0.2, color: '#bfc2c6' },
    patterns: ['grid', 'stagger', 'diagonal'],
    sizes: CERAMIC_SIZES,
  },
  {
    ...ceramic,
    id: 'floor.ceramic-diagonal',
    name: 'Cerâmica diagonal',
    tags: ['cerâmica', 'piso frio', 'diagonal', 'revestimento'],
    defaults: { pattern: 'diagonal', width: 45, length: 45, joint: 0.4, color: '#f2f0ec' },
    patterns: ['diagonal', 'grid', 'stagger'],
    sizes: CERAMIC_SIZES,
  },
]

const byId = new Map(FLOORS.map((f) => [f.id, f]))

/** Usado quando o projeto traz um piso que esta versão do app não conhece. */
export const UNKNOWN_FLOOR: FloorDef = { ...FLOORS[5]!, id: 'unknown-floor', name: 'Piso desconhecido', tags: [] }

export const isFloorId = (id: string): boolean => byId.has(id)
export const getFloor = (id: string): FloorDef => byId.get(id) ?? UNKNOWN_FLOOR

/** Busca nos pisos, com as mesmas regras da busca de componentes. */
export function searchFloors(query: string): FloorDef[] {
  const words = normalizeText(query).split(/\s+/).filter(Boolean)
  if (words.length === 0) return FLOORS
  return FLOORS.filter((f) => {
    const hay = normalizeText(['Pisos', f.name, f.group, ...f.tags].join(' '))
    return words.every((w) => hay.includes(w))
  })
}

/** Perda na compra: paginações com muitos cortes nas bordas pedem mais peças. */
export const wasteOf = (pattern: FloorPattern): number => (pattern === 'diagonal' || pattern === 'herringbone' ? 0.15 : 0.1)
