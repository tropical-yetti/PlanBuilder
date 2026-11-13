/**
 * Ajudas de precisão (docs/PLANO.md, seção 3), em ordem de prioridade:
 * 1. pontas e meio de paredes; 2. ângulos de 45° (15° com Shift) a partir do ponto anterior;
 * 3. alinhamento com outros nós (linhas-guia); 4. eixo de paredes; 5. grade. Alt desliga tudo.
 */

import {
  add,
  angleOf,
  dist,
  dot,
  fromAngle,
  lineIntersection,
  midpoint,
  projectOnSegment,
  roundTo,
  scale,
  sub,
} from '../model/geometry'
import { wallEnds } from '../model/walls'
import type { Id, Point, Project } from '../model/types'

/** Distância de captura em pixels de tela. */
export const SNAP_PX = 10

export type SnapKind = 'none' | 'node' | 'midpoint' | 'wall' | 'align' | 'angle' | 'grid'

export interface Guide {
  a: Point
  b: Point
}

export interface SnapResult {
  point: Point
  kind: SnapKind
  nodeId?: Id
  wallId?: Id
  guides: Guide[]
}

export interface SnapOptions {
  /** Pixels por centímetro (zoom atual). */
  pxPerCm: number
  /** Ponto anterior (início da parede): ativa o snap de ângulo. */
  from?: Point
  /** Shift: ângulo em passos de 15°, sempre travado. */
  shift?: boolean
  /** Alt: sem nenhum snap. */
  alt?: boolean
  excludeNodes?: Id[]
  excludeWalls?: Id[]
}

const DEG = Math.PI / 180

export function snapPoint(p: Project, raw: Point, opts: SnapOptions): SnapResult {
  if (opts.alt) return { point: raw, kind: 'none', guides: [] }

  const tol = SNAP_PX / opts.pxPerCm
  const grid = p.settings.gridSize
  const exN = new Set(opts.excludeNodes ?? [])
  const exW = new Set(opts.excludeWalls ?? [])
  const nodes = Object.values(p.nodes).filter((n) => !exN.has(n.id))
  const walls = Object.values(p.walls).filter((w) => !exW.has(w.id) && !exN.has(w.a) && !exN.has(w.b))

  // 1. Nós
  let bestNode: { id: Id; d: number } | null = null
  for (const n of nodes) {
    const d = dist(n, raw)
    if (d <= tol && (!bestNode || d < bestNode.d)) bestNode = { id: n.id, d }
  }
  if (bestNode) {
    const n = p.nodes[bestNode.id]!
    return { point: { x: n.x, y: n.y }, kind: 'node', nodeId: n.id, guides: [] }
  }

  // 1b. Meio das paredes
  for (const w of walls) {
    const [a, b] = wallEnds(p, w)
    const m = midpoint(a, b)
    if (dist(m, raw) <= tol) return { point: m, kind: 'midpoint', wallId: w.id, guides: [] }
  }

  // 2. Ângulo a partir do ponto anterior
  const from = opts.from
  if (from && dist(from, raw) > tol) {
    const ang = angleOf(sub(raw, from))
    const step = (opts.shift ? 15 : 45) * DEG
    const snappedAng = Math.round(ang / step) * step
    const r0 = dist(from, raw)
    const lateral = Math.abs(Math.sin(ang - snappedAng)) * r0
    if (opts.shift || lateral <= tol * 1.5) {
      const dir = fromAngle(snappedAng)
      const r = dot(sub(raw, from), dir)
      const onRay = (t: number) => add(from, scale(dir, t))

      // Parede cruzando a direção travada, perto do cursor
      let wallHit: { id: Id; t: number } | null = null
      for (const w of walls) {
        const [a, b] = wallEnds(p, w)
        const hit = lineIntersection(from, dir, a, sub(b, a))
        if (!hit || hit.u < 0 || hit.u > 1 || hit.t <= 0) continue
        if (Math.abs(hit.t - r) <= tol && (!wallHit || Math.abs(hit.t - r) < Math.abs(wallHit.t - r))) wallHit = { id: w.id, t: hit.t }
      }
      if (wallHit) return { point: onRay(wallHit.t), kind: 'wall', wallId: wallHit.id, guides: [] }

      // Alinhamento com nós (x ou y iguais) ao longo da direção travada
      let align: { t: number; node: Point } | null = null
      for (const n of nodes) {
        for (const axis of ['x', 'y'] as const) {
          const comp = dir[axis]
          if (Math.abs(comp) < 1e-6) continue
          const t = (n[axis] - from[axis]) / comp
          if (t <= 0 || Math.abs(t - r) > tol) continue
          if (!align || Math.abs(t - r) < Math.abs(align.t - r)) align = { t, node: { x: n.x, y: n.y } }
        }
      }
      if (align) {
        const point = onRay(align.t)
        return { point, kind: 'align', guides: [{ a: align.node, b: point }] }
      }

      return { point: onRay(Math.max(grid, roundTo(r, grid))), kind: 'angle', guides: [] }
    }
  }

  // 3. Eixo de parede
  let onWall: { id: Id; point: Point; d: number } | null = null
  for (const w of walls) {
    const [a, b] = wallEnds(p, w)
    const pr = projectOnSegment(raw, a, b)
    if (pr.distance <= tol && (!onWall || pr.distance < onWall.d)) onWall = { id: w.id, point: pr.point, d: pr.distance }
  }
  if (onWall) return { point: onWall.point, kind: 'wall', wallId: onWall.id, guides: [] }

  // 4. Alinhamento com nós (sem ponto anterior, ou fora do ângulo)
  let gx: { v: number; node: Point } | null = null
  let gy: { v: number; node: Point } | null = null
  for (const n of nodes) {
    if (Math.abs(n.x - raw.x) <= tol && (!gx || Math.abs(n.x - raw.x) < Math.abs(gx.v - raw.x))) gx = { v: n.x, node: n }
    if (Math.abs(n.y - raw.y) <= tol && (!gy || Math.abs(n.y - raw.y) < Math.abs(gy.v - raw.y))) gy = { v: n.y, node: n }
  }
  if (gx || gy) {
    const point = { x: gx ? gx.v : roundTo(raw.x, grid), y: gy ? gy.v : roundTo(raw.y, grid) }
    const guides: Guide[] = []
    if (gx) guides.push({ a: { x: gx.node.x, y: gx.node.y }, b: point })
    if (gy) guides.push({ a: { x: gy.node.x, y: gy.node.y }, b: point })
    return { point, kind: 'align', guides }
  }

  // 5. Grade
  return { point: { x: roundTo(raw.x, grid), y: roundTo(raw.y, grid) }, kind: 'grid', guides: [] }
}
