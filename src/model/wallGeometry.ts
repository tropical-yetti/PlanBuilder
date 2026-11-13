/**
 * Polígonos das paredes com cantos em esquadria (docs/PLANO.md, seção 4).
 *
 * Em cada nó, as paredes que saem dele são ordenadas pelo ângulo. Entre duas paredes vizinhas
 * nessa ordem, a borda de uma encontra a borda da outra: esse ponto de encontro é o canto comum.
 * Assim, cantos em L, T e X ficam fechados e sem sobreposição visível.
 */

import { add, angleOf, dist, lineIntersection, normalize, perp, scale, sub } from './geometry'
import type { Id, Point, Project, Wall } from './types'

export interface WallPolygon {
  wallId: Id
  /** Vértices em ordem: [esquerda no início, esquerda no fim, nó final, direita no fim, direita no início, nó inicial]. */
  points: Point[]
  /** Eixo da parede. */
  a: Point
  b: Point
}

/** Cantos de uma parede em um nó, relativos à direção que sai do nó (esquerda = normal anti-horária). */
interface NodeCorner {
  left: Point
  right: Point
}

/** Limite de esquadria: cantos muito agudos são cortados para não gerar pontas enormes. */
const MITER_LIMIT = 4

function cornerKey(wallId: Id, nodeId: Id): string {
  return `${wallId}@${nodeId}`
}

function computeCorners(p: Project): Map<string, NodeCorner> {
  const corners = new Map<string, NodeCorner>()
  const byNode = new Map<Id, Wall[]>()
  for (const w of Object.values(p.walls)) {
    for (const n of [w.a, w.b]) {
      const list = byNode.get(n)
      if (list) list.push(w)
      else byNode.set(n, [w])
    }
  }

  for (const [nodeId, walls] of byNode) {
    const node = p.nodes[nodeId]
    if (!node) continue
    const N: Point = { x: node.x, y: node.y }

    const items = walls
      .map((w) => {
        const otherId = w.a === nodeId ? w.b : w.a
        const other = p.nodes[otherId]
        const d = other ? normalize(sub(other, N)) : { x: 1, y: 0 }
        const h = w.thickness / 2
        const nrm = perp(d)
        return {
          w,
          d,
          h,
          angle: angleOf(d),
          leftBase: add(N, scale(nrm, h)),
          rightBase: add(N, scale(nrm, -h)),
        }
      })
      .sort((x, y) => x.angle - y.angle)

    const result = new Map<Id, NodeCorner>()
    for (const it of items) result.set(it.w.id, { left: it.leftBase, right: it.rightBase })

    if (items.length > 1) {
      for (let i = 0; i < items.length; i++) {
        const cur = items[i]!
        const next = items[(i + 1) % items.length]!
        // Girando no sentido do ângulo crescente, o lado "esquerdo" de `cur` encara o lado "direito" de `next`.
        const hit = lineIntersection(cur.leftBase, cur.d, next.rightBase, next.d)
        const limit = MITER_LIMIT * Math.max(cur.h, next.h)
        // Cantos internos ficam à frente do nó; cantos externos (ângulo > 180°) ficam atrás. Ambos valem.
        if (hit && dist(hit.point, N) <= limit) {
          result.get(cur.w.id)!.left = hit.point
          result.get(next.w.id)!.right = hit.point
        }
      }
    }

    for (const [wallId, c] of result) corners.set(cornerKey(wallId, nodeId), c)
  }
  return corners
}

const cache = new WeakMap<object, WeakMap<object, Map<Id, WallPolygon>>>()

/**
 * Polígono de cada parede. O resultado é guardado pelas referências de `nodes` e `walls`
 * (imutáveis graças ao Immer), então só é recalculado quando a geometria muda.
 */
export function wallPolygons(p: Project): Map<Id, WallPolygon> {
  let byWalls = cache.get(p.nodes)
  const hit = byWalls?.get(p.walls)
  if (hit) return hit

  const corners = computeCorners(p)
  const polys = new Map<Id, WallPolygon>()
  for (const w of Object.values(p.walls)) {
    const A = p.nodes[w.a]
    const B = p.nodes[w.b]
    if (!A || !B) continue
    const ca = corners.get(cornerKey(w.id, w.a))
    const cb = corners.get(cornerKey(w.id, w.b))
    if (!ca || !cb) continue
    // No nó B a direção que sai do nó é invertida: o lado esquerdo da parede é o "direito" visto de B.
    // O próprio nó entra como vértice entre os dois cantos de cada ponta: em junções em T (ou com
    // espessuras diferentes) os cantos não são simétricos, e sem o nó sobraria um buraco no encontro.
    const a = { x: A.x, y: A.y }
    const b = { x: B.x, y: B.y }
    polys.set(w.id, { wallId: w.id, a, b, points: [ca.left, cb.right, b, cb.left, ca.right, a] })
  }

  if (!byWalls) {
    byWalls = new WeakMap()
    cache.set(p.nodes, byWalls)
  }
  byWalls.set(p.walls, polys)
  return polys
}
