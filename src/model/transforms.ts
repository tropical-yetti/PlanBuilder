/**
 * Transformações da seleção e área de transferência (docs/PLANO.md, seção 6).
 * As funções alteram o projeto no lugar (uso dentro de `update`), como em walls.ts.
 */
import { textCorners } from './annotations'
import { boundsOf, type Rect } from './geometry'
import { addOpening, fitOpeningsToWalls, isOpeningValid, offsetRange } from './openings'
import { newId } from './project'
import { classify } from './selection'
import { itemCorners, normalizeAngle, resizeItem } from './items'
import type { Dimension, Id, Item, Opening, Point, Project, TextNote } from './types'
import { connectMovedNodes, drawWallSegment, findWallAt, nodePos, nodesOfWalls, openingCenter, setNodePositions, wallEnds, wallLength } from './walls'

// ---------------------------------------------------------------------------------------------
// Limites

/** Pontos que definem a extensão dos objetos (pelo eixo das paredes). */
export function selectionPoints(p: Project, ids: Id[]): Point[] {
  const c = classify(p, ids)
  const pts: Point[] = []
  for (const w of c.walls) pts.push(...wallEnds(p, w))
  for (const o of c.openings) if (p.walls[o.wallId]) pts.push(openingCenter(p, o))
  for (const t of c.texts) pts.push(...textCorners(t))
  for (const it of c.items) pts.push(...itemCorners(it))
  for (const d of c.dimensions) pts.push(d.p1, d.p2)
  return pts
}

export const selectionBounds = (p: Project, ids: Id[]): Rect | null => boundsOf(selectionPoints(p, ids))

// ---------------------------------------------------------------------------------------------
// Mover, girar, espelhar

type PointMap = (q: Point) => Point

/** Aplica uma transformação rígida às paredes (pelos nós), móveis, textos e cotas selecionados. */
function mapSelection(
  p: Project,
  ids: Id[],
  f: PointMap,
  extra: { rotateDeg?: number; mirror?: 'horizontal' | 'vertical'; settle?: boolean } = {},
): void {
  const mirrored = !!extra.mirror
  const c = classify(p, ids)
  const wallIds = c.walls.filter((w) => !w.locked).map((w) => w.id)
  const nodeIds = nodesOfWalls(p, wallIds)
  const positions: Record<Id, Point> = {}
  for (const id of nodeIds) positions[id] = f(nodePos(p, id))
  setNodePositions(p, positions)

  for (const t of c.texts) {
    if (t.locked) continue
    const q = f(t)
    t.x = Math.round(q.x * 100) / 100
    t.y = Math.round(q.y * 100) / 100
    if (extra.rotateDeg) t.rotation = (((t.rotation + extra.rotateDeg) % 360) + 360) % 360
  }
  for (const d of c.dimensions) {
    if (d.locked) continue
    d.p1 = f(d.p1)
    d.p2 = f(d.p2)
    // No espelho, o lado da linha de cota inverte junto.
    if (mirrored) d.offset = -d.offset
  }
  for (const it of c.items) {
    if (it.locked) continue
    const q = f(it)
    it.x = Math.round(q.x * 100) / 100
    it.y = Math.round(q.y * 100) / 100
    if (extra.rotateDeg) it.rotation = normalizeAngle(it.rotation + extra.rotateDeg)
    // Espelhar um móvel girado: o ângulo reflete e o desenho inverte da esquerda para a direita.
    if (extra.mirror === 'horizontal') it.rotation = normalizeAngle(-it.rotation)
    if (extra.mirror === 'vertical') it.rotation = normalizeAngle(180 - it.rotation)
    if (mirrored) it.mirrored = !it.mirrored
  }
  if (mirrored) {
    // Portas e janelas das paredes espelhadas passam a abrir para o lado espelhado.
    for (const o of Object.values(p.openings)) {
      if (wallIds.includes(o.wallId)) o.flipSide = !o.flipSide
    }
  }
  if (extra.settle === false) return
  connectMovedNodes(p, nodeIds)
  fitOpeningsToWalls(p)
}

export function translateSelection(p: Project, ids: Id[], delta: Point): void {
  mapSelection(p, ids, (q) => ({ x: q.x + delta.x, y: q.y + delta.y }))
}

/**
 * Desloca a seleção sem ligar o que se tocar: usado a cada movimento do mouse durante um arraste.
 * Ao soltar, `settleSelection` faz as ligações.
 */
export function shiftSelection(p: Project, ids: Id[], delta: Point): void {
  mapSelection(p, ids, (q) => ({ x: q.x + delta.x, y: q.y + delta.y }), { settle: false })
}

/** Liga os cantos que passaram a se tocar e ajusta as aberturas, depois de um arraste. */
export function settleSelection(p: Project, ids: Id[]): void {
  connectMovedNodes(p, nodesOfWalls(p, classify(p, ids).walls.map((w) => w.id)))
  fitOpeningsToWalls(p)
}

/** Centro da seleção, arredondado a 1 cm para que giros de 90° mantenham medidas inteiras. */
export function selectionCenter(p: Project, ids: Id[]): Point | null {
  const b = selectionBounds(p, ids)
  return b ? { x: Math.round((b.minX + b.maxX) / 2), y: Math.round((b.minY + b.maxY) / 2) } : null
}

/** Gira em torno do centro da seleção. Ângulo positivo = sentido horário na tela. */
export function rotateSelection(p: Project, ids: Id[], degrees: number): void {
  const c = selectionCenter(p, ids)
  if (!c) return
  const quarter = ((Math.round(degrees / 90) % 4) + 4) % 4
  const exact = Math.abs(degrees / 90 - Math.round(degrees / 90)) < 1e-9
  const rad = (degrees * Math.PI) / 180
  // Para múltiplos de 90° usa seno/cosseno exatos, sem resíduo de ponto flutuante.
  const cos = exact ? [1, 0, -1, 0][quarter]! : Math.cos(rad)
  const sin = exact ? [0, 1, 0, -1][quarter]! : Math.sin(rad)
  mapSelection(p, ids, (q) => ({ x: c.x + (q.x - c.x) * cos - (q.y - c.y) * sin, y: c.y + (q.x - c.x) * sin + (q.y - c.y) * cos }), {
    rotateDeg: degrees,
  })
}

/** Espelha em torno do centro: 'horizontal' troca esquerda e direita; 'vertical' troca cima e baixo. */
export function mirrorSelection(p: Project, ids: Id[], axis: 'horizontal' | 'vertical'): void {
  const c = selectionCenter(p, ids)
  if (!c) return
  const f: PointMap = axis === 'horizontal' ? (q) => ({ x: 2 * c.x - q.x, y: q.y }) : (q) => ({ x: q.x, y: 2 * c.y - q.y })
  mapSelection(p, ids, f, { mirror: axis })
}

/** Redimensiona a seleção pelo fator dado, a partir do centro (ex.: corrigir um desenho fora de escala). */
export function scaleSelection(p: Project, ids: Id[], factor: number): void {
  const c = selectionCenter(p, ids)
  if (!c || factor <= 0) return
  mapSelection(p, ids, (q) => ({ x: c.x + (q.x - c.x) * factor, y: c.y + (q.y - c.y) * factor }))
}

/** Move as aberturas ao longo das suas paredes (setas do teclado). Só anda se a nova posição for válida. */
export function nudgeOpenings(p: Project, ids: Id[], delta: Point): void {
  for (const id of ids) {
    const o = p.openings[id]
    const w = o && p.walls[o.wallId]
    if (!o || !w || o.locked) continue
    const [a, b] = wallEnds(p, w)
    const L = wallLength(p, w)
    if (L < 1e-6) continue
    const along = ((b.x - a.x) * delta.x + (b.y - a.y) * delta.y) / L
    const next = o.offset + along
    if (Math.abs(along) > 1e-6 && isOpeningValid(p, w.id, next, o.width, o.id)) o.offset = Math.round(next * 100) / 100
  }
}

// ---------------------------------------------------------------------------------------------
// Alinhar e distribuir

interface Unit {
  /** Objetos que andam juntos: paredes ligadas entre si formam uma unidade só. */
  ids: Id[]
  bounds: Rect
}

/** Agrupa a seleção em unidades rígidas: cada texto, cada cota e cada grupo de paredes que compartilham nós. */
export function selectionUnits(p: Project, ids: Id[]): Unit[] {
  const c = classify(p, ids)
  const units: Unit[] = []
  const walls = c.walls.filter((w) => !w.locked)
  const seen = new Set<Id>()
  for (const w of walls) {
    if (seen.has(w.id)) continue
    const group: Id[] = []
    const stack = [w]
    seen.add(w.id)
    while (stack.length > 0) {
      const cur = stack.pop()!
      group.push(cur.id)
      for (const other of walls) {
        if (!seen.has(other.id) && (other.a === cur.a || other.a === cur.b || other.b === cur.a || other.b === cur.b)) {
          seen.add(other.id)
          stack.push(other)
        }
      }
    }
    const b = selectionBounds(p, group)
    if (b) units.push({ ids: group, bounds: b })
  }
  for (const item of [...c.items, ...c.texts, ...c.dimensions]) {
    if (item.locked) continue
    const b = selectionBounds(p, [item.id])
    if (b) units.push({ ids: [item.id], bounds: b })
  }
  return units
}

export type AlignMode = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'

const value = (b: Rect, mode: AlignMode): number =>
  mode === 'left' ? b.minX : mode === 'right' ? b.maxX : mode === 'centerX' ? (b.minX + b.maxX) / 2 : mode === 'top' ? b.minY : mode === 'bottom' ? b.maxY : (b.minY + b.maxY) / 2

/** Alinha as unidades da seleção pela borda (ou centro) do conjunto. */
export function alignSelection(p: Project, ids: Id[], mode: AlignMode): void {
  const units = selectionUnits(p, ids)
  const all = boundsOf(units.flatMap((u) => [{ x: u.bounds.minX, y: u.bounds.minY }, { x: u.bounds.maxX, y: u.bounds.maxY }]))
  if (units.length < 2 || !all) return
  const target = value(all, mode)
  const horizontal = mode === 'left' || mode === 'centerX' || mode === 'right'
  for (const u of units) {
    const d = Math.round((target - value(u.bounds, mode)) * 100) / 100
    if (d !== 0) translateSelection(p, u.ids, horizontal ? { x: d, y: 0 } : { x: 0, y: d })
  }
}

/** Distribui as unidades com espaços iguais entre elas, mantendo as duas das pontas no lugar. */
export function distributeSelection(p: Project, ids: Id[], axis: 'x' | 'y'): void {
  const units = selectionUnits(p, ids)
  if (units.length < 3) return
  const lo = (b: Rect) => (axis === 'x' ? b.minX : b.minY)
  const hi = (b: Rect) => (axis === 'x' ? b.maxX : b.maxY)
  units.sort((u, v) => lo(u.bounds) - lo(v.bounds))
  const span = hi(units.at(-1)!.bounds) - lo(units[0]!.bounds)
  const used = units.reduce((s, u) => s + hi(u.bounds) - lo(u.bounds), 0)
  const gap = (span - used) / (units.length - 1)
  let cursor = lo(units[0]!.bounds)
  for (const u of units) {
    const d = Math.round((cursor - lo(u.bounds)) * 100) / 100
    if (d !== 0) translateSelection(p, u.ids, axis === 'x' ? { x: d, y: 0 } : { x: 0, y: d })
    cursor += hi(u.bounds) - lo(u.bounds) + gap
  }
}

// ---------------------------------------------------------------------------------------------
// Área de transferência

type OpeningData = Omit<Opening, 'id' | 'wallId' | 'offset' | 'locked'>

export interface Clip {
  app: 'planbuilder'
  v: 1
  walls: { a: Point; b: Point; thickness: number; height: number }[]
  /** Aberturas pelo centro no mundo; ao colar, cada uma procura a parede que passa por ali. */
  openings: (OpeningData & { center: Point; sourceWallId: Id; sourceOffset: number; alone: boolean })[]
  texts: Omit<TextNote, 'id' | 'locked'>[]
  /** Ausente em conteúdo copiado por versões anteriores do app. */
  items?: Omit<Item, 'id' | 'locked'>[]
  dimensions: Omit<Dimension, 'id' | 'locked'>[]
}

/** Copia a seleção. As portas e janelas das paredes copiadas vão junto. */
export function copySelection(p: Project, ids: Id[]): Clip | null {
  const c = classify(p, ids)
  if (c.count === 0) return null
  const wallIds = new Set(c.walls.map((w) => w.id))
  const openings = new Map<Id, { o: Opening; alone: boolean }>()
  for (const o of Object.values(p.openings)) if (wallIds.has(o.wallId)) openings.set(o.id, { o, alone: false })
  for (const o of c.openings) if (!openings.has(o.id) && p.walls[o.wallId]) openings.set(o.id, { o, alone: true })
  return {
    app: 'planbuilder',
    v: 1,
    walls: c.walls.map((w) => {
      const [a, b] = wallEnds(p, w)
      return { a, b, thickness: w.thickness, height: w.height }
    }),
    openings: [...openings.values()].map(({ o, alone }) => ({
      componentId: o.componentId,
      width: o.width,
      height: o.height,
      sillHeight: o.sillHeight,
      flipSide: o.flipSide,
      flipHinge: o.flipHinge,
      params: { ...o.params },
      center: openingCenter(p, o),
      sourceWallId: o.wallId,
      sourceOffset: o.offset,
      alone,
    })),
    texts: c.texts.map(({ x, y, text, size, rotation }) => ({ x, y, text, size, rotation })),
    items: c.items.map(({ id: _id, locked: _locked, ...rest }) => ({ ...rest, params: { ...rest.params } })),
    dimensions: c.dimensions.map(({ p1, p2, offset }) => ({ p1: { ...p1 }, p2: { ...p2 }, offset })),
  }
}

export function parseClip(text: string): Clip | null {
  try {
    const c = JSON.parse(text) as Partial<Clip>
    if (c.app !== 'planbuilder' || c.v !== 1) return null
    if (![c.walls, c.openings, c.texts, c.dimensions].every(Array.isArray)) return null
    return c as Clip
  } catch {
    return null
  }
}

export function clipBounds(clip: Clip): Rect | null {
  return boundsOf([
    ...clip.walls.flatMap((w) => [w.a, w.b]),
    ...clip.openings.map((o) => o.center),
    ...clip.texts.map((t) => ({ x: t.x, y: t.y })),
    ...(clip.items ?? []).flatMap((it) => itemCorners(it)),
    ...clip.dimensions.flatMap((d) => [d.p1, d.p2]),
  ])
}

/** Posição livre mais próxima de `desired` para um vão dessa largura (procura em passos de 5 cm). */
export function findFreeOffset(p: Project, wallId: Id, desired: number, width: number): number | null {
  const range = offsetRange(p, wallId, width)
  if (!range) return null
  const start = Math.min(range.max, Math.max(range.min, desired))
  for (let d = 0; d <= range.max - range.min + 5; d += 5) {
    for (const off of d === 0 ? [start] : [start + d, start - d]) {
      const o = Math.min(range.max, Math.max(range.min, off))
      if (isOpeningValid(p, wallId, o, width)) return o
    }
  }
  return null
}

/**
 * Cola o conteúdo deslocado por `delta`. As paredes coladas se ligam às existentes (como se fossem
 * desenhadas). Uma porta ou janela copiada sozinha vai para a parede que passar pelo novo ponto;
 * se não houver, fica na parede de origem, na posição livre mais próxima.
 * Retorna os ids criados, para virarem a nova seleção.
 */
export function pasteClip(p: Project, clip: Clip, delta: Point): Id[] {
  const move = (q: Point): Point => ({ x: Math.round((q.x + delta.x) * 100) / 100, y: Math.round((q.y + delta.y) * 100) / 100 })
  const created: Id[] = []

  for (const w of clip.walls) {
    const r = drawWallSegment(p, move(w.a), move(w.b), { thickness: w.thickness, height: w.height })
    created.push(...r.wallIds)
  }

  for (const o of clip.openings) {
    const { center, sourceWallId, sourceOffset, alone, ...data } = o
    const target = move(center)
    const hit = findWallAt(p, target, alone ? 30 : 1)
    let wallId: Id | null = null
    let offset: number | null = null
    if (hit) {
      const w = p.walls[hit.wallId]!
      wallId = w.id
      const desired = hit.t * wallLength(p, w)
      offset = alone ? findFreeOffset(p, w.id, desired, o.width) : desired
    } else if (alone && p.walls[sourceWallId]) {
      wallId = sourceWallId
      offset = findFreeOffset(p, sourceWallId, sourceOffset + o.width + 10, o.width)
    }
    if (!wallId || offset === null) continue
    const id = addOpening(p, { ...data, params: { ...data.params }, wallId, offset })
    if (id) created.push(id)
  }

  for (const t of clip.texts) {
    const id = newId()
    const q = move(t)
    p.texts[id] = { ...t, id, x: q.x, y: q.y }
    created.push(id)
  }
  for (const it of clip.items ?? []) {
    const id = newId()
    const q = move(it)
    p.items[id] = { ...it, params: { ...it.params }, id, x: q.x, y: q.y }
    created.push(id)
  }
  for (const d of clip.dimensions) {
    const id = newId()
    p.dimensions[id] = { id, p1: move(d.p1), p2: move(d.p2), offset: d.offset }
    created.push(id)
  }
  return [...new Set(created)]
}

// ---------------------------------------------------------------------------------------------
// Copiar e colar propriedades

export interface StyleClip {
  wall?: { thickness: number; height: number }
  opening?: { componentId: string; width: number; height: number; sillHeight: number; params: Record<string, unknown> }
  text?: { size: number; rotation: number }
  item?: { componentId: string; width: number; depth: number; height: number; params: Record<string, unknown> }
}

/** Guarda as medidas do primeiro objeto de cada tipo na seleção. */
export function copyStyle(p: Project, ids: Id[]): StyleClip | null {
  const c = classify(p, ids)
  const style: StyleClip = {}
  const w = c.walls[0]
  const o = c.openings[0]
  const t = c.texts[0]
  const it = c.items[0]
  if (it) style.item = { componentId: it.componentId, width: it.width, depth: it.depth, height: it.height, params: { ...it.params } }
  if (w) style.wall = { thickness: w.thickness, height: w.height }
  if (o) style.opening = { componentId: o.componentId, width: o.width, height: o.height, sillHeight: o.sillHeight, params: { ...o.params } }
  if (t) style.text = { size: t.size, rotation: t.rotation }
  return w || o || t || it ? style : null
}

/** Aplica as medidas guardadas aos objetos do mesmo tipo. Aberturas só mudam de largura se couber. */
export function pasteStyle(p: Project, ids: Id[], style: StyleClip): void {
  const c = classify(p, ids)
  if (style.wall) {
    for (const w of c.walls) {
      if (w.locked) continue
      w.thickness = style.wall.thickness
      w.height = style.wall.height
    }
  }
  if (style.opening) {
    for (const o of c.openings) {
      if (o.locked) continue
      if (isOpeningValid(p, o.wallId, o.offset, style.opening.width, o.id)) o.width = style.opening.width
      o.height = style.opening.height
      o.sillHeight = style.opening.sillHeight
      if (o.componentId === style.opening.componentId) o.params = { ...style.opening.params }
    }
  }
  if (style.item) {
    // Medidas de um móvel só passam para móveis do mesmo tipo (um sofá não vira do tamanho de uma cama).
    for (const it of c.items) {
      if (it.locked || it.componentId !== style.item.componentId) continue
      resizeItem(it, { width: style.item.width, depth: style.item.depth }, true)
      it.height = style.item.height
      it.params = { ...style.item.params }
    }
  }
  if (style.text) {
    for (const t of c.texts) {
      if (t.locked) continue
      t.size = style.text.size
      t.rotation = style.text.rotation
    }
  }
}
