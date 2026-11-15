/**
 * Detecção de cômodos (docs/PLANO.md, seção 7).
 *
 * As paredes formam um grafo planar (há um nó em todo encontro). Cada parede vira duas arestas
 * dirigidas; partindo de uma aresta e virando sempre para a mesma mão em cada nó, percorre-se o
 * contorno de uma face. As faces fechadas são os cômodos; a face externa de cada grupo de paredes
 * ligadas é o seu contorno de fora.
 */
import { angleOf, signedArea, sub } from './geometry'
import type { Id, Point, Project } from './types'
import { dividesRooms } from './walls'

export interface Face {
  /** Nós do contorno, em ordem. Paredes soltas dentro da face aparecem como ida e volta. */
  nodeIds: Id[]
  wallIds: Id[]
  /** Contorno pelo eixo das paredes. */
  polygon: Point[]
  /** Área pelo eixo (sempre positiva). */
  area: number
  /** Grupo de paredes ligadas a que a face pertence. */
  component: number
}

export interface FaceSet {
  /** Faces fechadas (candidatas a cômodo). */
  inner: Face[]
  /** Contorno externo de cada grupo de paredes ligadas. */
  outer: Face[]
  /** Grupo de cada nó. */
  componentOf: Map<Id, number>
}

/** Faces menores que isto (cm²) são ruído numérico. */
const MIN_FACE_AREA = 1

export function detectFaces(p: Project): FaceSet {
  // Arestas dirigidas que saem de cada nó, ordenadas pelo ângulo.
  interface HalfEdge {
    from: Id
    to: Id
    wallId: Id
    angle: number
    used: boolean
  }
  const out = new Map<Id, HalfEdge[]>()
  const push = (from: Id, to: Id, wallId: Id) => {
    const a = p.nodes[from]
    const b = p.nodes[to]
    if (!a || !b) return
    const list = out.get(from) ?? []
    list.push({ from, to, wallId, angle: angleOf(sub(b, a)), used: false })
    out.set(from, list)
  }
  // Painéis (parede falsa, painel de TV) não separam cômodos: ficam fora do grafo.
  const dividing = Object.values(p.walls).filter(dividesRooms)
  for (const w of dividing) {
    if (w.a === w.b) continue
    push(w.a, w.b, w.id)
    push(w.b, w.a, w.id)
  }
  for (const list of out.values()) list.sort((x, y) => x.angle - y.angle)

  // Grupos de paredes ligadas (união-busca).
  const parent = new Map<Id, Id>()
  const find = (x: Id): Id => {
    let r = x
    while (parent.get(r) !== r) r = parent.get(r)!
    parent.set(x, r)
    return r
  }
  for (const id of out.keys()) parent.set(id, id)
  for (const w of dividing) {
    if (parent.has(w.a) && parent.has(w.b)) parent.set(find(w.a), find(w.b))
  }
  const componentIndex = new Map<Id, number>()
  const componentOf = new Map<Id, number>()
  for (const id of out.keys()) {
    const root = find(id)
    if (!componentIndex.has(root)) componentIndex.set(root, componentIndex.size)
    componentOf.set(id, componentIndex.get(root)!)
  }

  const inner: Face[] = []
  const outer: Face[] = []
  for (const list of out.values()) {
    for (const start of list) {
      if (start.used) continue
      const nodeIds: Id[] = []
      const wallIds: Id[] = []
      let e = start
      // Limite de segurança: uma face não pode ter mais arestas do que o grafo inteiro.
      for (let guard = 0; guard < 4 * Object.keys(p.walls).length + 4; guard++) {
        e.used = true
        nodeIds.push(e.from)
        wallIds.push(e.wallId)
        const around = out.get(e.to)!
        const back = around.findIndex((h) => h.to === e.from && h.wallId === e.wallId)
        // A próxima aresta é a vizinha (em ângulo) da aresta de volta: vira sempre para a mesma mão.
        e = around[(back + 1) % around.length]!
        if (e === start) break
      }
      const polygon = nodeIds.map((id) => ({ x: p.nodes[id]!.x, y: p.nodes[id]!.y }))
      const sa = signedArea(polygon)
      const face: Face = { nodeIds, wallIds: [...new Set(wallIds)], polygon, area: Math.abs(sa), component: componentOf.get(start.from)! }
      // Com esta regra de percurso, as faces fechadas têm área com sinal negativo e a externa, positivo.
      if (sa < -MIN_FACE_AREA) inner.push(face)
      else outer.push(face)
    }
  }
  return { inner, outer, componentOf }
}
