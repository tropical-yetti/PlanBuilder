/**
 * Geometria 3D das paredes sem subtração de volumes (docs/PLANO.md, seção 4).
 *
 * Cada parede é cortada ao longo do comprimento em faixas: trechos cheios (do piso ao topo) e,
 * em cada porta ou janela, o peitoril (abaixo do vão) e a verga (acima). Cada faixa é um polígono
 * em planta com uma altura inicial e final; a vista 3D só precisa extrudar esses polígonos.
 * As pontas usam os cantos em esquadria do desenho 2D, então os encontros de parede ficam fechados.
 */
import { add, dist, dot, normalize, perp, scale, sub } from '../model/geometry'
import { openingsOnWall } from '../model/openings'
import { wallPolygons } from '../model/wallGeometry'
import type { Id, Point, Project } from '../model/types'

export interface WallPiece {
  wallId: Id
  kind: 'solid' | 'sill' | 'lintel'
  /** Contorno em planta (cm). */
  points: Point[]
  /** Altura da base e do topo (cm). */
  y0: number
  y1: number
}

/** Faixas mais baixas que isto (cm) não são geradas. */
const MIN_HEIGHT = 0.5

export function buildWallPieces(p: Project): WallPiece[] {
  const pieces: WallPiece[] = []
  const polys = wallPolygons(p)

  for (const w of Object.values(p.walls)) {
    const poly = polys.get(w.id)
    if (!poly) continue
    const [l0, l1, b, r1, r0, a] = poly.points as [Point, Point, Point, Point, Point, Point]
    const L = dist(a, b)
    if (L < 0.01) continue
    const d = normalize(sub(b, a))
    const n = scale(perp(d), w.thickness / 2)
    const along = (q: Point) => dot(sub(q, a), d)
    // Até onde os cantos em esquadria avançam sobre cada face: um corte não pode ficar antes disso.
    const left = { min: along(l0), max: along(l1) }
    const right = { min: along(r0), max: along(r1) }
    const leftAt = (s: number): Point => (s <= 0 ? l0 : s >= L ? l1 : add(add(a, scale(d, Math.min(left.max, Math.max(left.min, s)))), n))
    const rightAt = (s: number): Point => (s <= 0 ? r0 : s >= L ? r1 : sub(add(a, scale(d, Math.min(right.max, Math.max(right.min, s)))), n))

    const footprint = (u: number, v: number): Point[] => {
      const pts = [leftAt(u), leftAt(v)]
      if (v >= L) pts.push(b)
      pts.push(rightAt(v), rightAt(u))
      if (u <= 0) pts.push(a)
      return pts
    }
    const push = (kind: WallPiece['kind'], u: number, v: number, y0: number, y1: number) => {
      if (v - u > 0.01 && y1 - y0 > MIN_HEIGHT) pieces.push({ wallId: w.id, kind, points: footprint(u, v), y0, y1 })
    }

    let cursor = 0
    for (const o of openingsOnWall(p, w.id)) {
      const u = Math.max(cursor, Math.min(L, o.offset - o.width / 2))
      const v = Math.max(u, Math.min(L, o.offset + o.width / 2))
      const bottom = Math.max(0, Math.min(w.height, o.sillHeight))
      const top = Math.max(bottom, Math.min(w.height, o.sillHeight + o.height))
      push('solid', cursor, u, 0, w.height)
      push('sill', u, v, 0, bottom)
      push('lintel', u, v, top, w.height)
      cursor = v
    }
    push('solid', cursor, L, 0, w.height)
  }
  return pieces
}
