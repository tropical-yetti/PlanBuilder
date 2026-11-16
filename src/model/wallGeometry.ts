/**
 * Polígonos das paredes com cantos em esquadria (docs/PLANO.md, seção 4).
 *
 * Em cada nó, as paredes que saem dele são ordenadas pelo ângulo. Entre duas paredes vizinhas
 * nessa ordem, a borda de uma encontra a borda da outra: esse ponto de encontro é o canto comum.
 * Assim, cantos em L, T e X ficam fechados e sem sobreposição visível.
 *
 * Quando paredes de tipos diferentes se encontram, a de maior prioridade (alvenaria > divisória > painel)
 * segue contínua, como na obra: a divisória ou o painel termina na face dela, sem entrar na parede.
 */

import { add, angleOf, dist, lineIntersection, normalize, perp, scale, sub } from './geometry'
import type { Id, Point, Project, Wall, WallKind } from './types'

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
  /** A parede termina na face de outra de maior prioridade: a ponta é reta, sem o vértice do nó. */
  flat?: boolean
}

const PRIORITY: Record<WallKind, number> = { masonry: 3, partition: 2, panel: 1 }
const priorityOf = (w: Wall) => PRIORITY[w.kind ?? 'masonry']

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

    // Só as paredes de maior prioridade no nó se encontram em esquadria entre si.
    const top = Math.max(...items.map((it) => priorityOf(it.w)))
    const main = items.filter((it) => priorityOf(it.w) === top)
    const minor = items.filter((it) => priorityOf(it.w) !== top)

    // As de menor prioridade param na face mais próxima das principais (a primeira que a lateral cruza).
    for (const it of minor) {
      const cut = (base: Point): Point | null => {
        let best: { t: number; point: Point } | null = null
        for (const m of main) {
          for (const face of [m.leftBase, m.rightBase]) {
            const hit = lineIntersection(base, it.d, face, m.d)
            if (hit && hit.t > -1e-9 && hit.t <= MITER_LIMIT * Math.max(it.h, m.h) && (!best || hit.t < best.t)) best = { t: hit.t, point: hit.point }
          }
        }
        return best?.point ?? null
      }
      const left = cut(it.leftBase)
      const right = cut(it.rightBase)
      if (left && right) result.set(it.w.id, { left, right, flat: true })
    }

    if (main.length > 1) {
      for (let i = 0; i < main.length; i++) {
        const cur = main[i]!
        const next = main[(i + 1) % main.length]!
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
    // Ponta reta (parede que termina na face de outra): no lugar do nó, o meio da ponta, para não entrar na outra parede.
    const endA = ca.flat ? { x: (ca.left.x + ca.right.x) / 2, y: (ca.left.y + ca.right.y) / 2 } : a
    const endB = cb.flat ? { x: (cb.left.x + cb.right.x) / 2, y: (cb.left.y + cb.right.y) / 2 } : b
    polys.set(w.id, { wallId: w.id, a, b, points: [ca.left, cb.right, endB, cb.left, ca.right, endA] })
  }

  if (!byWalls) {
    byWalls = new WeakMap()
    cache.set(p.nodes, byWalls)
  }
  byWalls.set(p.walls, polys)
  return polys
}
