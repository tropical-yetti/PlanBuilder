/**
 * Áreas e quantitativos (docs/PLANO.md, seção 7). Tudo é derivado das paredes a cada alteração;
 * do documento só se usam os nomes dos cômodos (`roomLabels`). Áreas em cm², comprimentos em cm.
 */
import { difference, union } from 'polyclip-ts'
import { dist, midpoint, normalize, perp, pointInPolygon, scale, sub, add } from './geometry'
import { detectFaces, type Face } from './rooms'
import type { Id, Point, Project } from './types'
import { wallPolygons } from './wallGeometry'

type Ring = [number, number][]
/** Polígono com furos: o primeiro anel é o contorno, os demais são furos. */
type Poly = Ring[]
type MultiPoly = Poly[]

export interface Room {
  /** Chave estável enquanto as paredes do contorno não mudarem. */
  key: string
  name: string
  /** O nome foi dado pelo usuário (senão é "Cômodo N"). */
  named: boolean
  /** Área interna, até a face das paredes. */
  area: number
  /** Perímetro interno (rodapé). */
  perimeter: number
  /** Área de superfície das paredes voltadas para o cômodo, descontando vãos. */
  wallArea: number
  /** Região interna (pode ter furos, ex.: um pilar ou um cômodo-ilha). */
  shape: MultiPoly
  /** Ponto dentro do cômodo, para o rótulo. */
  labelPoint: Point
  wallIds: Id[]
}

export interface WallSide {
  /** Comprimento real da face (com os cantos em esquadria). */
  length: number
  /** Comprimento × altura − vãos. */
  area: number
  /** Cômodo para o qual a face está voltada; null = face externa. */
  roomKey: string | null
}

export interface OpeningCount {
  componentId: string
  count: number
}

export interface Quantities {
  rooms: Room[]
  /** Área construída: contorno externo, incluindo as paredes. */
  totalArea: number
  /** Área útil: soma das áreas internas dos cômodos. */
  usefulArea: number
  /** Área ocupada pelas paredes em planta. */
  wallPlanArea: number
  /** Área de superfície das paredes, descontando vãos. */
  wallSurface: { internal: number; external: number }
  /** Perímetro externo da edificação. */
  externalPerimeter: number
  /** Soma dos comprimentos das paredes pelo eixo. */
  wallLength: number
  /** Área total dos vãos de portas e janelas. */
  openingsArea: number
  openingCounts: OpeningCount[]
  /** Faces de cada parede: esquerda e direita em relação ao sentido a → b. */
  wallSides: Map<Id, { left: WallSide; right: WallSide }>
}

// ---------------------------------------------------------------------------------------------
// Utilidades de polígonos

const toRing = (pts: Point[]): Ring => pts.map((q) => [q.x, q.y])

function ringArea(r: Ring): number {
  let s = 0
  for (let i = 0; i < r.length; i++) {
    const a = r[i]!
    const b = r[(i + 1) % r.length]!
    s += a[0] * b[1] - b[0] * a[1]
  }
  return Math.abs(s / 2)
}

function ringLength(r: Ring): number {
  let s = 0
  for (let i = 0; i < r.length; i++) {
    const a = r[i]!
    const b = r[(i + 1) % r.length]!
    // Anéis podem vir fechados (último ponto = primeiro): o trecho de comprimento zero não soma nada.
    s += Math.hypot(b[0] - a[0], b[1] - a[1])
  }
  return s
}

const polyArea = (poly: Poly): number => poly.reduce((s, ring, i) => (i === 0 ? s + ringArea(ring) : s - ringArea(ring)), 0)
export const multiArea = (mp: MultiPoly): number => mp.reduce((s, poly) => s + polyArea(poly), 0)
const multiPerimeter = (mp: MultiPoly): number => mp.reduce((s, poly) => s + poly.reduce((t, r) => t + ringLength(r), 0), 0)
const outerPerimeter = (mp: MultiPoly): number => mp.reduce((s, poly) => s + (poly[0] ? ringLength(poly[0]) : 0), 0)

const ringToPoints = (r: Ring): Point[] => r.map(([x, y]) => ({ x, y }))

export function pointInMulti(pt: Point, mp: MultiPoly): boolean {
  return mp.some((poly) => {
    const [outer, ...holes] = poly
    return !!outer && pointInPolygon(pt, ringToPoints(outer)) && !holes.some((h) => pointInPolygon(pt, ringToPoints(h)))
  })
}

/** As operações de polígonos podem falhar em geometrias degeneradas; nesse caso, segue sem o recorte. */
function safe(op: () => MultiPoly, fallback: MultiPoly): MultiPoly {
  try {
    return op()
  } catch {
    return fallback
  }
}

/** Um ponto garantidamente dentro da região: o centroide, se cair dentro; senão, o meio do trecho mais largo numa linha horizontal. */
function interiorPoint(mp: MultiPoly): Point {
  const poly = [...mp].sort((a, b) => polyArea(b) - polyArea(a))[0]
  const outer = poly?.[0]
  if (!poly || !outer || outer.length === 0) return { x: 0, y: 0 }
  let cx = 0
  let cy = 0
  let a2 = 0
  for (let i = 0; i < outer.length; i++) {
    const p = outer[i]!
    const q = outer[(i + 1) % outer.length]!
    const c = p[0] * q[1] - q[0] * p[1]
    a2 += c
    cx += (p[0] + q[0]) * c
    cy += (p[1] + q[1]) * c
  }
  if (Math.abs(a2) > 1e-9) {
    const centroid = { x: cx / (3 * a2), y: cy / (3 * a2) }
    if (pointInMulti(centroid, [poly])) return centroid
  }
  // Varre algumas linhas horizontais e fica com o meio do maior trecho interno.
  const ys = outer.map((p) => p[1])
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  let best: { x: number; y: number; w: number } | null = null
  for (const f of [0.5, 0.25, 0.75, 0.125, 0.875]) {
    const y = minY + (maxY - minY) * f
    const xs: number[] = []
    for (const ring of poly) {
      for (let i = 0; i < ring.length; i++) {
        const p = ring[i]!
        const q = ring[(i + 1) % ring.length]!
        if (p[1] > y !== q[1] > y) xs.push(p[0] + ((y - p[1]) * (q[0] - p[0])) / (q[1] - p[1]))
      }
    }
    xs.sort((m, n) => m - n)
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const w = xs[i + 1]! - xs[i]!
      if (!best || w > best.w) best = { x: (xs[i]! + xs[i + 1]!) / 2, y, w }
    }
  }
  return best ? { x: best.x, y: best.y } : { x: outer[0]![0], y: outer[0]![1] }
}

// ---------------------------------------------------------------------------------------------

function roomKey(face: Face): string {
  return [...face.wallIds].sort().join('|')
}

function compute(p: Project): Quantities {
  const polys = wallPolygons(p)
  const wallRings: Poly[] = [...polys.values()].map((w) => [toRing(w.points)])
  const empty: MultiPoly = []
  const wallsUnion = wallRings.length > 0 ? safe(() => union(wallRings[0]!, ...wallRings.slice(1)), wallRings) : empty

  const faces = detectFaces(p)

  // Cômodos: face pelo eixo, menos as paredes e menos os grupos de paredes que ficam dentro dela (ilhas).
  const rooms: Room[] = []
  for (const face of faces.inner) {
    const islands = faces.outer
      .filter((o) => o.component !== face.component && o.polygon[0] && pointInPolygon(o.polygon[0], face.polygon))
      .filter((o) => o.area > 1)
      .map((o): Poly => [toRing(o.polygon)])
    const base: Poly = [toRing(face.polygon)]
    const cut = [wallsUnion, ...islands].filter((g) => g.length > 0)
    const shape = cut.length > 0 ? safe(() => difference(base, ...cut), [base]) : [base]
    const area = multiArea(shape)
    if (area < 1) continue
    rooms.push({
      key: roomKey(face),
      name: '',
      named: false,
      area,
      perimeter: multiPerimeter(shape),
      wallArea: 0,
      shape,
      labelPoint: interiorPoint(shape),
      wallIds: face.wallIds,
    })
  }

  // Ordem de leitura (de cima para baixo, da esquerda para a direita) para a numeração automática.
  rooms.sort((a, b) => a.labelPoint.y - b.labelPoint.y || a.labelPoint.x - b.labelPoint.x)
  const labels = Object.values(p.roomLabels)
  let auto = 0
  for (const room of rooms) {
    const label = labels.find((l) => l.name.trim() !== '' && pointInMulti(l, room.shape))
    if (label) {
      room.name = label.name
      room.named = true
    } else {
      auto += 1
      room.name = `Cômodo ${auto}`
    }
  }

  // Área construída: união das paredes com as faces fechadas.
  const faceRings: Poly[] = faces.inner.map((f) => [toRing(f.polygon)])
  const footprintParts = [...(wallsUnion.length > 0 ? [wallsUnion] : []), ...faceRings]
  const footprint = footprintParts.length > 0 ? safe(() => union(footprintParts[0]!, ...footprintParts.slice(1)), wallsUnion) : empty

  // Superfície das paredes: cada face (esquerda/direita) é interna de um cômodo ou externa.
  const openingAreaByWall = new Map<Id, number>()
  let openingsArea = 0
  const countById = new Map<string, number>()
  for (const o of Object.values(p.openings)) {
    const w = p.walls[o.wallId]
    if (!w) continue
    const h = Math.max(0, Math.min(o.height, w.height - o.sillHeight))
    const a = o.width * h
    openingAreaByWall.set(w.id, (openingAreaByWall.get(w.id) ?? 0) + a)
    openingsArea += a
    countById.set(o.componentId, (countById.get(o.componentId) ?? 0) + 1)
  }

  const wallSides = new Map<Id, { left: WallSide; right: WallSide }>()
  const surface = { internal: 0, external: 0 }
  let wallLength = 0
  const roomByKey = new Map(rooms.map((r) => [r.key, r]))
  for (const w of Object.values(p.walls)) {
    const poly = polys.get(w.id)
    if (!poly) continue
    wallLength += dist(poly.a, poly.b)
    const n = perp(normalize(sub(poly.b, poly.a)))
    const [l0, l1, , r1, r0] = poly.points as [Point, Point, Point, Point, Point, Point]
    const holes = openingAreaByWall.get(w.id) ?? 0
    const side = (p0: Point, p1: Point, outward: Point): WallSide => {
      const length = dist(p0, p1)
      const probe = add(midpoint(p0, p1), scale(outward, 1))
      const room = rooms.find((r) => pointInMulti(probe, r.shape))
      const area = Math.max(0, length * w.height - holes)
      if (room) {
        surface.internal += area
        roomByKey.get(room.key)!.wallArea += area
      } else {
        surface.external += area
      }
      return { length, area, roomKey: room?.key ?? null }
    }
    wallSides.set(w.id, { left: side(l0, l1, n), right: side(r0, r1, scale(n, -1)) })
  }

  return {
    rooms,
    totalArea: multiArea(footprint),
    usefulArea: rooms.reduce((s, r) => s + r.area, 0),
    wallPlanArea: multiArea(wallsUnion),
    wallSurface: surface,
    externalPerimeter: outerPerimeter(footprint),
    wallLength,
    openingsArea,
    openingCounts: [...countById].map(([componentId, count]) => ({ componentId, count })),
    wallSides,
  }
}

const cache = new WeakMap<Project, Quantities>()

/** Quantitativos do projeto. O resultado fica guardado enquanto o documento não muda. */
export function quantities(p: Project): Quantities {
  let q = cache.get(p)
  if (!q) {
    q = compute(p)
    cache.set(p, q)
  }
  return q
}

/** Cômodo que contém o ponto. */
export function roomAt(p: Project, point: Point): Room | null {
  return quantities(p).rooms.find((r) => pointInMulti(point, r.shape)) ?? null
}
