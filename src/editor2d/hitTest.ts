import { dist, pointInPolygon, projectOnSegment, rectFromPoints, pointInRect, segmentIntersectsRect } from '../model/geometry'
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

export function hitTest(p: Project, point: Point, pxPerCm: number, opts: { nodes?: boolean } = {}): HoverTarget | null {
  if (opts.nodes !== false) {
    const n = hitNode(p, point, pxPerCm)
    if (n) return { kind: 'node', id: n }
  }
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
