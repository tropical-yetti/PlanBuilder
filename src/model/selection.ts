import { deleteWall } from './walls'
import type { Dimension, Id, Item, Opening, Project, TextNote, Wall } from './types'

export interface Classified {
  walls: Wall[]
  openings: Opening[]
  texts: TextNote[]
  dimensions: Dimension[]
  items: Item[]
  /** Quantidade total de objetos existentes na seleção. */
  count: number
}

/** Separa os ids selecionados por tipo, ignorando os que não existem mais (ex.: depois de desfazer). */
export function classify(p: Project, ids: Id[]): Classified {
  const r: Classified = { walls: [], openings: [], texts: [], dimensions: [], items: [], count: 0 }
  for (const id of ids) {
    const w = p.walls[id]
    const o = p.openings[id]
    const t = p.texts[id]
    const d = p.dimensions[id]
    const it = p.items[id]
    if (w) r.walls.push(w)
    else if (it) r.items.push(it)
    else if (o) r.openings.push(o)
    else if (t) r.texts.push(t)
    else if (d) r.dimensions.push(d)
    else continue
    r.count += 1
  }
  return r
}

export const isLocked = (p: Project, id: Id): boolean =>
  !!(p.walls[id]?.locked || p.openings[id]?.locked || p.texts[id]?.locked || p.dimensions[id]?.locked || p.items[id]?.locked)

export function setLocked(p: Project, ids: Id[], locked: boolean): void {
  for (const id of ids) {
    const obj = p.walls[id] ?? p.openings[id] ?? p.texts[id] ?? p.dimensions[id] ?? p.items[id]
    if (!obj) continue
    if (locked) obj.locked = true
    else delete obj.locked
  }
}

export function lockedIds(p: Project): Id[] {
  return [...Object.values(p.walls), ...Object.values(p.openings), ...Object.values(p.items), ...Object.values(p.texts), ...Object.values(p.dimensions)]
    .filter((o) => o.locked)
    .map((o) => o.id)
}

/** Todos os objetos selecionáveis (não bloqueados). */
export function allSelectable(p: Project): Id[] {
  return [...Object.keys(p.walls), ...Object.keys(p.openings), ...Object.keys(p.items), ...Object.keys(p.texts), ...Object.keys(p.dimensions)].filter(
    (id) => !isLocked(p, id),
  )
}

/** Objetos "parecidos" com o dado: paredes de mesma espessura, aberturas e móveis do mesmo componente, textos, cotas. */
export function similarTo(p: Project, id: Id): Id[] {
  const w = p.walls[id]
  if (w) return Object.values(p.walls).filter((x) => x.thickness === w.thickness && !x.locked).map((x) => x.id)
  const o = p.openings[id]
  if (o) return Object.values(p.openings).filter((x) => x.componentId === o.componentId && !x.locked).map((x) => x.id)
  const it = p.items[id]
  if (it) return Object.values(p.items).filter((x) => x.componentId === it.componentId && !x.locked).map((x) => x.id)
  if (p.texts[id]) return Object.values(p.texts).filter((x) => !x.locked).map((x) => x.id)
  if (p.dimensions[id]) return Object.values(p.dimensions).filter((x) => !x.locked).map((x) => x.id)
  return []
}

/** Exclui objetos de qualquer tipo (paredes levam junto suas portas e janelas). Bloqueados ficam. */
export function deleteObjects(p: Project, ids: Id[]): void {
  for (const id of ids) {
    if (isLocked(p, id)) continue
    if (p.openings[id]) delete p.openings[id]
    else if (p.items[id]) delete p.items[id]
    else if (p.texts[id]) delete p.texts[id]
    else if (p.dimensions[id]) delete p.dimensions[id]
  }
  for (const id of ids) {
    if (p.walls[id] && !p.walls[id].locked) deleteWall(p, id)
  }
}

/** Descrição da exclusão para o histórico ("Parede excluída", "3 objetos excluídos"...). */
export function deleteLabel(p: Project, ids: Id[]): string {
  const c = classify(p, ids)
  if (c.count !== 1) return `${c.count} objetos excluídos`
  if (c.walls.length) return 'Parede excluída'
  if (c.openings.length) return 'Abertura excluída'
  if (c.items.length) return 'Móvel excluído'
  if (c.texts.length) return 'Texto excluído'
  return 'Cota excluída'
}
