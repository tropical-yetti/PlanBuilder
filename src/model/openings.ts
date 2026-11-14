/**
 * Operações sobre aberturas (portas e janelas). Uma abertura fica presa a uma parede:
 * `offset` é a distância do nó inicial da parede até o centro do vão.
 * Como em walls.ts, as funções alteram o projeto no lugar (uso dentro de `update`).
 */
import { newId } from './project'
import type { Id, Opening, Project } from './types'
import { wallLength } from './walls'

/** Distância mínima entre a borda do vão e a ponta da parede (para não cortar o canto). */
export const END_MARGIN = 5

export function openingsOnWall(p: Project, wallId: Id): Opening[] {
  return Object.values(p.openings)
    .filter((o) => o.wallId === wallId)
    .sort((a, b) => a.offset - b.offset)
}

/** Faixa de `offset` em que um vão dessa largura cabe na parede; null se a parede for curta demais. */
export function offsetRange(p: Project, wallId: Id, width: number): { min: number; max: number } | null {
  const w = p.walls[wallId]
  if (!w) return null
  const L = wallLength(p, w)
  const min = END_MARGIN + width / 2
  const max = L - END_MARGIN - width / 2
  return max >= min - 1e-6 ? { min, max: Math.max(min, max) } : null
}

/** O vão cabe na parede e não se sobrepõe a outra abertura? */
export function isOpeningValid(p: Project, wallId: Id, offset: number, width: number, ignoreId?: Id): boolean {
  const range = offsetRange(p, wallId, width)
  if (!range || offset < range.min - 1e-6 || offset > range.max + 1e-6) return false
  for (const o of openingsOnWall(p, wallId)) {
    if (o.id === ignoreId) continue
    if (Math.abs(o.offset - offset) < (o.width + width) / 2 - 1e-6) return false
  }
  return true
}

/** Leva o offset para dentro da parede (sem olhar as outras aberturas). */
export function clampOffset(p: Project, wallId: Id, offset: number, width: number): number | null {
  const range = offsetRange(p, wallId, width)
  return range ? Math.min(range.max, Math.max(range.min, offset)) : null
}

export type NewOpening = Omit<Opening, 'id'>

/** Insere a abertura se a posição for válida. Retorna o id, ou null se não couber. */
export function addOpening(p: Project, data: NewOpening): Id | null {
  if (!isOpeningValid(p, data.wallId, data.offset, data.width)) return null
  const id = newId()
  p.openings[id] = { ...data, id, offset: Math.round(data.offset * 100) / 100 }
  return id
}

export function deleteOpening(p: Project, id: Id): void {
  delete p.openings[id]
}

/** Move a abertura (na mesma parede ou para outra). Retorna false, sem alterar nada, se não couber. */
export function moveOpening(p: Project, id: Id, wallId: Id, offset: number): boolean {
  const o = p.openings[id]
  if (!o || !isOpeningValid(p, wallId, offset, o.width, id)) return false
  o.wallId = wallId
  o.offset = Math.round(offset * 100) / 100
  return true
}

/** Muda a largura mantendo o centro. Retorna false se a nova largura não couber. */
export function resizeOpening(p: Project, id: Id, width: number): boolean {
  const o = p.openings[id]
  if (!o || !isOpeningValid(p, o.wallId, o.offset, width, id)) return false
  o.width = width
  return true
}

/** Centraliza a abertura na parede. Retorna false se o centro estiver ocupado. */
export function centerOpening(p: Project, id: Id): boolean {
  const o = p.openings[id]
  const w = o && p.walls[o.wallId]
  if (!o || !w) return false
  return moveOpening(p, id, o.wallId, wallLength(p, w) / 2)
}

/** Todas as aberturas estão na mesma parede? Retorna a parede. */
export function commonWall(p: Project, ids: Id[]): Id | null {
  const first = p.openings[ids[0] ?? '']?.wallId
  return first && ids.every((id) => p.openings[id]?.wallId === first) ? first : null
}

/**
 * Distribui as aberturas de uma parede com espaços iguais entre si e até as pontas.
 * Considera todas as aberturas da parede (não só as selecionadas), para não gerar sobreposição.
 */
export function distributeOpenings(p: Project, wallId: Id): boolean {
  const w = p.walls[wallId]
  if (!w) return false
  const list = openingsOnWall(p, wallId)
  if (list.length === 0) return false
  const L = wallLength(p, w)
  const total = list.reduce((s, o) => s + o.width, 0)
  const gap = (L - total) / (list.length + 1)
  if (gap < END_MARGIN) return false
  let x = gap
  for (const o of list) {
    o.offset = Math.round((x + o.width / 2) * 100) / 100
    x += o.width + gap
  }
  return true
}

/** Distâncias da abertura até as pontas da parede (borda do vão até o nó). */
export function distancesToEnds(p: Project, o: Pick<Opening, 'wallId' | 'offset' | 'width'>): { start: number; end: number } {
  const w = p.walls[o.wallId]
  const L = w ? wallLength(p, w) : 0
  return { start: o.offset - o.width / 2, end: L - o.offset - o.width / 2 }
}

/**
 * Depois de mudar o comprimento de paredes: aberturas que ficaram fora são trazidas para dentro,
 * e as que não cabem mais (ou passaram a se sobrepor) são removidas.
 */
export function fitOpeningsToWalls(p: Project, wallIds?: Id[]): void {
  const walls = wallIds ?? Object.keys(p.walls)
  for (const wallId of walls) {
    const kept: Opening[] = []
    for (const o of openingsOnWall(p, wallId)) {
      const off = clampOffset(p, wallId, o.offset, o.width)
      const overlaps = off !== null && kept.some((k) => Math.abs(k.offset - off) < (k.width + o.width) / 2 - 1e-6)
      if (off === null || overlaps) {
        delete p.openings[o.id]
        continue
      }
      o.offset = off
      kept.push(o)
    }
  }
}

/** Estica a abertura para ocupar a parede inteira (menos a margem das pontas). Falha se houver outra abertura na parede. */
export function fillWall(p: Project, id: Id): boolean {
  const o = p.openings[id]
  const w = o && p.walls[o.wallId]
  if (!o || !w) return false
  const L = wallLength(p, w)
  const width = Math.floor((L - 2 * END_MARGIN) * 10) / 10
  if (width <= 0 || !isOpeningValid(p, w.id, L / 2, width, id)) return false
  o.width = width
  o.offset = Math.round((L / 2) * 100) / 100
  return true
}
