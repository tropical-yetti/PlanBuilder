import { dist, dot, normalize, perp, pointInPolygon, projectOnSegment, rectFromPoints, pointInRect, segmentIntersectsRect, sub } from '../model/geometry'
import { openingCenter } from '../model/walls'
import { wallPolygons } from '../model/wallGeometry'
import type { Id, Point, Project } from '../model/types'
import type { HoverTarget } from './interactionStore'

/** Distância de clique em pixels de tela. */
export const HIT_PX = 6

/** Nó sob o cursor (cantos e pontas de parede). */
export function hitNode(p: Project, point: Point, pxPerCm: number, radiusPx = 9): Id | null {
  const tol = radiusPx / pxPerCm
  let best: { id: Id; d: number } | null = null
  for (const n of Object.values(p.nodes)) {
    const d = dist(n, point)
    if (d <= tol && (!best || d < best.d)) best = { id: n.id, d }
  }
  return best?.id ?? null
}

/** Parede sob o cursor: dentro do polígono ou a poucos pixels do eixo. */
export function hitWall(p: Project, point: Point, pxPerCm: number): Id | null {
  const polys = wallPolygons(p)
  const tol = HIT_PX / pxPerCm
  let best: { id: Id; d: number } | null = null
  for (const w of Object.values(p.walls)) {
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
export function hitOpening(p: Project, point: Point, pxPerCm: number): Id | null {
  const tol = HIT_PX / pxPerCm
  for (const o of Object.values(p.openings)) {
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

export function hitTest(p: Project, point: Point, pxPerCm: number, opts: { nodes?: boolean } = {}): HoverTarget | null {
  if (opts.nodes !== false) {
    const n = hitNode(p, point, pxPerCm)
    if (n) return { kind: 'node', id: n }
  }
  const o = hitOpening(p, point, pxPerCm)
  if (o) return { kind: 'opening', id: o }
  const w = hitWall(p, point, pxPerCm)
  return w ? { kind: 'wall', id: w } : null
}

/**
 * Paredes dentro da caixa. `touching = false`: só as que estão inteiras dentro (caixa da esquerda para a direita);
 * `touching = true`: todas que a caixa toca (da direita para a esquerda), como no AutoCAD.
 */
export function wallsInBox(p: Project, a: Point, b: Point, touching: boolean): Id[] {
  const r = rectFromPoints(a, b)
  const polys = wallPolygons(p)
  const ids: Id[] = []
  for (const w of Object.values(p.walls)) {
    const poly = polys.get(w.id)
    if (!poly) continue
    if (touching) {
      const pts = poly.points
      const hit =
        pts.some((q) => pointInRect(q, r)) ||
        pts.some((q, i) => segmentIntersectsRect(q, pts[(i + 1) % pts.length]!, r)) ||
        pointInPolygon({ x: r.minX, y: r.minY }, pts)
      if (hit) ids.push(w.id)
    } else if (poly.points.every((q) => pointInRect(q, r))) {
      ids.push(w.id)
    }
  }
  return ids
}

/** Aberturas cujo centro está dentro da caixa. */
export function openingsInBox(p: Project, a: Point, b: Point): Id[] {
  const r = rectFromPoints(a, b)
  return Object.values(p.openings)
    .filter((o) => p.walls[o.wallId] && pointInRect(openingCenter(p, o), r))
    .map((o) => o.id)
}
