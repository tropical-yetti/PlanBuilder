import { dimensionGeometry, textCorners } from '../model/annotations'
import { dist, dot, normalize, perp, pointInPolygon, pointInRect, projectOnSegment, rectFromPoints, segmentIntersectsRect, sub } from '../model/geometry'
import { getItem } from '../library/registry'
import { itemCorners, pointInItem } from '../model/items'
import { wallPolygons } from '../model/wallGeometry'
import { openingCenter, wallsAtNode } from '../model/walls'
import type { Id, Point, Project } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import type { HoverTarget } from './interactionStore'

/** Distância de clique em pixels de tela. */
export const HIT_PX = 6

export interface HitOptions {
  /** Considerar os cantos das paredes (padrão: sim). */
  nodes?: boolean
  /** Considerar objetos bloqueados (padrão: não; usado pelo menu de contexto para desbloquear). */
  includeLocked?: boolean
}

const layers = () => useEditorStore.getState().layers

/** Nó sob o cursor (cantos e pontas de parede). */
export function hitNode(p: Project, point: Point, pxPerCm: number, radiusPx = 9, includeLocked = false): Id | null {
  const tol = radiusPx / pxPerCm
  let best: { id: Id; d: number } | null = null
  for (const n of Object.values(p.nodes)) {
    const d = dist(n, point)
    if (d > tol || (best && d >= best.d)) continue
    // Um canto só pode ser arrastado se nenhuma das paredes ligadas a ele estiver bloqueada.
    if (!includeLocked && wallsAtNode(p, n.id).some((w) => w.locked)) continue
    best = { id: n.id, d }
  }
  return best?.id ?? null
}

/** Parede sob o cursor: dentro do polígono ou a poucos pixels do eixo. */
export function hitWall(p: Project, point: Point, pxPerCm: number, includeLocked = false): Id | null {
  const polys = wallPolygons(p)
  const tol = HIT_PX / pxPerCm
  let best: { id: Id; d: number } | null = null
  for (const w of Object.values(p.walls)) {
    if (w.locked && !includeLocked) continue
    const poly = polys.get(w.id)
    if (!poly) continue
    const pr = projectOnSegment(point, poly.a, poly.b)
    const inside = pointInPolygon(point, poly.points)
    const d = inside ? 0 : Math.max(0, pr.distance - w.thickness / 2)
    if ((inside || d <= tol) && (!best || pr.distance < best.d)) best = { id: w.id, d: pr.distance }
  }
  return best?.id ?? null
}

/** Abertura (porta/janela) sob o cursor: dentro do vão, em toda a espessura da parede. */
export function hitOpening(p: Project, point: Point, pxPerCm: number, includeLocked = false): Id | null {
  if (!layers().openings) return null
  const tol = HIT_PX / pxPerCm
  for (const o of Object.values(p.openings)) {
    if (o.locked && !includeLocked) continue
    const w = p.walls[o.wallId]
    const a = w && p.nodes[w.a]
    const b = w && p.nodes[w.b]
    if (!w || !a || !b) continue
    const dir = normalize(sub(b, a))
    const rel = sub(point, openingCenter(p, o))
    if (Math.abs(dot(rel, dir)) <= o.width / 2 && Math.abs(dot(rel, perp(dir))) <= w.thickness / 2 + tol) return o.id
  }
  return null
}

/** Móvel sob o cursor; entre móveis sobrepostos, o que foi inserido por último (desenhado por cima). */
export function hitItem(p: Project, point: Point, pxPerCm: number, includeLocked = false): Id | null {
  if (!layers().items) return null
  const tol = 2 / pxPerCm
  const list = Object.values(p.items)
  for (let i = list.length - 1; i >= 0; i--) {
    const it = list[i]!
    if (it.locked && !includeLocked) continue
    if (pointInItem(it, point, !!getItem(it.componentId).round, tol)) return it.id
  }
  return null
}

export function hitText(p: Project, point: Point, includeLocked = false): Id | null {
  if (!layers().texts) return null
  for (const t of Object.values(p.texts)) {
    if (t.locked && !includeLocked) continue
    if (pointInPolygon(point, textCorners(t))) return t.id
  }
  return null
}

/** Cota sob o cursor: perto da linha de medida ou das linhas de chamada. */
export function hitDimension(p: Project, point: Point, pxPerCm: number, includeLocked = false): Id | null {
  if (!layers().dimensions) return null
  const tol = (HIT_PX + 3) / pxPerCm
  for (const d of Object.values(p.dimensions)) {
    if (d.locked && !includeLocked) continue
    const g = dimensionGeometry(d)
    if (
      projectOnSegment(point, g.a, g.b).distance <= tol ||
      projectOnSegment(point, d.p1, g.a).distance <= tol / 2 ||
      projectOnSegment(point, d.p2, g.b).distance <= tol / 2
    ) {
      return d.id
    }
  }
  return null
}

export function hitTest(p: Project, point: Point, pxPerCm: number, opts: HitOptions = {}): HoverTarget | null {
  const locked = opts.includeLocked ?? false
  if (opts.nodes !== false) {
    const n = hitNode(p, point, pxPerCm, 9, locked)
    if (n) return { kind: 'node', id: n }
  }
  const t = hitText(p, point, locked)
  if (t) return { kind: 'text', id: t }
  const d = hitDimension(p, point, pxPerCm, locked)
  if (d) return { kind: 'dimension', id: d }
  const o = hitOpening(p, point, pxPerCm, locked)
  if (o) return { kind: 'opening', id: o }
  const it = hitItem(p, point, pxPerCm, locked)
  if (it) return { kind: 'item', id: it }
  const w = hitWall(p, point, pxPerCm, locked)
  return w ? { kind: 'wall', id: w } : null
}

/**
 * Objetos dentro da caixa. `touching = false`: só os que estão inteiros dentro (caixa da esquerda para a direita);
 * `touching = true`: todos que a caixa toca (da direita para a esquerda), como no AutoCAD.
 * Objetos bloqueados e camadas ocultas ficam de fora.
 */
export function objectsInBox(p: Project, a: Point, b: Point, touching: boolean): Id[] {
  const r = rectFromPoints(a, b)
  const l = layers()
  const ids: Id[] = []
  const polyHit = (pts: Point[]): boolean =>
    touching
      ? pts.some((q) => pointInRect(q, r)) ||
        pts.some((q, i) => segmentIntersectsRect(q, pts[(i + 1) % pts.length]!, r)) ||
        pointInPolygon({ x: r.minX, y: r.minY }, pts)
      : pts.every((q) => pointInRect(q, r))

  const polys = wallPolygons(p)
  for (const w of Object.values(p.walls)) {
    const poly = polys.get(w.id)
    if (poly && !w.locked && polyHit(poly.points)) ids.push(w.id)
  }
  if (l.openings) {
    for (const o of Object.values(p.openings)) {
      if (!o.locked && p.walls[o.wallId] && pointInRect(openingCenter(p, o), r)) ids.push(o.id)
    }
  }
  if (l.items) {
    for (const it of Object.values(p.items)) if (!it.locked && polyHit(itemCorners(it))) ids.push(it.id)
  }
  if (l.texts) {
    for (const t of Object.values(p.texts)) if (!t.locked && polyHit(textCorners(t))) ids.push(t.id)
  }
  if (l.dimensions) {
    for (const d of Object.values(p.dimensions)) {
      const g = dimensionGeometry(d)
      if (!d.locked && polyHit([d.p1, d.p2, g.b, g.a])) ids.push(d.id)
    }
  }
  return ids
}
