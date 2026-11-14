/**
 * Operações sobre paredes e nós do documento.
 *
 * Todas as funções recebem o projeto e o alteram no lugar, para serem usadas dentro de
 * `useProjectStore.getState().update(label, (draft) => ...)` (o Immer transforma isso em um passo do histórico).
 *
 * Invariantes mantidas:
 * - dois nós nunca ocupam o mesmo ponto (tolerância NODE_TOL);
 * - paredes que se cruzam sempre têm um nó no cruzamento;
 * - não existem paredes de comprimento zero nem duas paredes entre o mesmo par de nós;
 * - nós sem paredes são removidos.
 */

import {
  add,
  cross,
  dist,
  dot,
  lineIntersection,
  normalize,
  perp,
  projectOnSegment,
  scale,
  segmentIntersection,
  sub,
  tidy,
} from './geometry'
import { newId } from './project'
import type { Id, Opening, Point, Project, Wall } from './types'

/** Pontos a menos de 0,5 cm um do outro são considerados o mesmo nó. */
export const NODE_TOL = 0.5

export type WallProps = Pick<Wall, 'thickness' | 'height'>

export function defaultWallProps(p: Project): WallProps {
  return { thickness: p.settings.defaultWallThickness, height: p.settings.defaultWallHeight }
}

// ---------------------------------------------------------------------------------------------
// Consultas

export function nodePos(p: Project, id: Id): Point {
  const n = p.nodes[id]
  if (!n) throw new Error(`Nó inexistente: ${id}`)
  return { x: n.x, y: n.y }
}

export function wallEnds(p: Project, w: Wall): [Point, Point] {
  return [nodePos(p, w.a), nodePos(p, w.b)]
}

export function wallLength(p: Project, w: Wall): number {
  const [a, b] = wallEnds(p, w)
  return dist(a, b)
}

export function wallsAtNode(p: Project, nodeId: Id): Wall[] {
  return Object.values(p.walls).filter((w) => w.a === nodeId || w.b === nodeId)
}

export const otherNode = (w: Wall, nodeId: Id): Id => (w.a === nodeId ? w.b : w.a)

export function findWallBetween(p: Project, a: Id, b: Id): Wall | undefined {
  return Object.values(p.walls).find((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))
}

/** Nó mais próximo do ponto, dentro da tolerância. */
export function findNodeAt(p: Project, point: Point, tol = NODE_TOL, exclude: Id[] = []): Id | null {
  let best: Id | null = null
  let bestD = tol
  for (const n of Object.values(p.nodes)) {
    if (exclude.includes(n.id)) continue
    const d = dist(n, point)
    if (d <= bestD) {
      best = n.id
      bestD = d
    }
  }
  return best
}

/** Parede cujo eixo passa pelo ponto (fora das pontas), dentro da tolerância. */
export function findWallAt(
  p: Project,
  point: Point,
  tol = NODE_TOL,
  exclude: Id[] = [],
): { wallId: Id; t: number; point: Point } | null {
  let best: { wallId: Id; t: number; point: Point } | null = null
  let bestD = tol
  for (const w of Object.values(p.walls)) {
    if (exclude.includes(w.id)) continue
    const [a, b] = wallEnds(p, w)
    const pr = projectOnSegment(point, a, b)
    if (pr.distance <= bestD && pr.t > 0 && pr.t < 1) {
      best = { wallId: w.id, t: pr.t, point: pr.point }
      bestD = pr.distance
    }
  }
  return best
}

// ---------------------------------------------------------------------------------------------
// Aberturas (portas/janelas) presas às paredes

function openingsOf(p: Project, wallId: Id): Opening[] {
  return Object.values(p.openings).filter((o) => o.wallId === wallId)
}

/** Centro da abertura em coordenadas do mundo. */
export function openingCenter(p: Project, o: Opening): Point {
  const w = p.walls[o.wallId]
  if (!w) throw new Error(`Parede inexistente: ${o.wallId}`)
  const [a, b] = wallEnds(p, w)
  return add(a, scale(normalize(sub(b, a)), o.offset))
}

/** Reposiciona aberturas (dadas pelo centro no mundo) na parede mais adequada entre as candidatas. */
function reattachOpenings(p: Project, centers: Map<Id, Point>, candidates: Id[]): void {
  for (const [openingId, c] of centers) {
    const o = p.openings[openingId]
    if (!o) continue
    let best: { wallId: Id; offset: number; d: number } | null = null
    for (const wid of candidates) {
      const w = p.walls[wid]
      if (!w) continue
      const [a, b] = wallEnds(p, w)
      const pr = projectOnSegment(c, a, b)
      if (!best || pr.distance < best.d) best = { wallId: wid, offset: pr.t * dist(a, b), d: pr.distance }
    }
    if (!best) {
      delete p.openings[openingId]
      continue
    }
    o.wallId = best.wallId
    o.offset = best.offset
  }
}

function captureOpeningCenters(p: Project, wallIds: Id[]): Map<Id, Point> {
  const m = new Map<Id, Point>()
  for (const wid of wallIds) for (const o of openingsOf(p, wid)) m.set(o.id, openingCenter(p, o))
  return m
}

// ---------------------------------------------------------------------------------------------
// Criação

export function addNode(p: Project, point: Point): Id {
  const id = newId()
  const t = tidy(point)
  p.nodes[id] = { id, x: t.x, y: t.y }
  return id
}

/** Cria a parede entre dois nós. Se já existir uma entre eles, retorna a existente. */
export function addWall(p: Project, a: Id, b: Id, props: WallProps): Id | null {
  if (a === b) return null
  const existing = findWallBetween(p, a, b)
  if (existing) return existing.id
  const id = newId()
  p.walls[id] = { id, a, b, thickness: props.thickness, height: props.height }
  return id
}

/**
 * Divide a parede no ponto (projetado sobre o eixo). Retorna o nó criado,
 * ou o nó da ponta se o ponto estiver colado nela.
 */
export function splitWall(p: Project, wallId: Id, point: Point): Id {
  const w = p.walls[wallId]
  if (!w) throw new Error(`Parede inexistente: ${wallId}`)
  const [a, b] = wallEnds(p, w)
  const pr = projectOnSegment(point, a, b)
  if (dist(pr.point, a) <= NODE_TOL) return w.a
  if (dist(pr.point, b) <= NODE_TOL) return w.b

  const centers = captureOpeningCenters(p, [wallId])
  const n = addNode(p, pr.point)
  const newWallId = newId()
  p.walls[newWallId] = { ...w, id: newWallId, a: n, b: w.b }
  w.b = n
  reattachOpenings(p, centers, [wallId, newWallId])
  return n
}

/** Retorna o nó naquele ponto: um existente, um criado dividindo a parede que passa ali, ou um novo. */
export function resolveNode(p: Project, point: Point): Id {
  const existing = findNodeAt(p, point)
  if (existing) return existing
  const onWall = findWallAt(p, point)
  if (onWall) return splitWall(p, onWall.wallId, onWall.point)
  return addNode(p, point)
}

/**
 * Desenha uma parede de `start` a `end`, ligando-a ao que já existe:
 * reaproveita nós, divide paredes tocadas no meio e cria nós em todos os cruzamentos.
 * Retorna os nós das pontas e as paredes criadas (ou reaproveitadas), em ordem.
 */
export function drawWallSegment(
  p: Project,
  start: Point,
  end: Point,
  props: WallProps = defaultWallProps(p),
): { startNode: Id; endNode: Id; wallIds: Id[] } {
  const s = resolveNode(p, start)
  const e = resolveNode(p, end)
  if (s === e) return { startNode: s, endNode: e, wallIds: [] }

  const S = nodePos(p, s)
  const E = nodePos(p, e)
  const length = dist(S, E)
  const tEps = NODE_TOL / Math.max(length, NODE_TOL)

  // Pontos intermediários: cruzamentos com paredes e nós existentes sobre o novo segmento.
  const stops: { t: number; point: Point }[] = []
  for (const w of Object.values(p.walls)) {
    const [a, b] = wallEnds(p, w)
    const hit = segmentIntersection(S, E, a, b)
    if (hit && hit.t > tEps && hit.t < 1 - tEps) stops.push({ t: hit.t, point: hit.point })
  }
  for (const n of Object.values(p.nodes)) {
    if (n.id === s || n.id === e) continue
    const pr = projectOnSegment(n, S, E)
    if (pr.distance <= NODE_TOL && pr.t > tEps && pr.t < 1 - tEps) stops.push({ t: pr.t, point: { x: n.x, y: n.y } })
  }
  stops.sort((x, y) => x.t - y.t)

  const chain: Id[] = [s]
  for (const stop of stops) {
    const id = resolveNode(p, stop.point)
    if (id !== chain.at(-1)) chain.push(id)
  }
  if (chain.at(-1) !== e) chain.push(e)

  const wallIds: Id[] = []
  for (let i = 0; i < chain.length - 1; i++) {
    const id = addWall(p, chain[i]!, chain[i + 1]!, props)
    if (id) wallIds.push(id)
  }
  return { startNode: s, endNode: e, wallIds }
}

/** Cria um cômodo retangular (4 paredes) com cantos opostos em `a` e `b`, pelo eixo das paredes. */
export function drawRectRoom(p: Project, a: Point, b: Point, props: WallProps = defaultWallProps(p)): Id[] {
  const corners: Point[] = [a, { x: b.x, y: a.y }, b, { x: a.x, y: b.y }]
  const ids: Id[] = []
  for (let i = 0; i < 4; i++) ids.push(...drawWallSegment(p, corners[i]!, corners[(i + 1) % 4]!, props).wallIds)
  return ids
}

// ---------------------------------------------------------------------------------------------
// Exclusão e junção

function removeOrphanNode(p: Project, nodeId: Id): void {
  if (p.nodes[nodeId] && wallsAtNode(p, nodeId).length === 0) delete p.nodes[nodeId]
}

/** Exclui a parede, suas aberturas e os nós que ficarem sem parede. */
export function deleteWall(p: Project, wallId: Id): void {
  const w = p.walls[wallId]
  if (!w) return
  for (const o of openingsOf(p, wallId)) delete p.openings[o.id]
  delete p.walls[wallId]
  removeOrphanNode(p, w.a)
  removeOrphanNode(p, w.b)
}

/** Funde o nó `removeId` em `keepId` (ex.: ao soltar um canto sobre outro). */
export function mergeNodes(p: Project, keepId: Id, removeId: Id): void {
  if (keepId === removeId) return
  for (const w of wallsAtNode(p, removeId)) {
    if (w.a === removeId) w.a = keepId
    if (w.b === removeId) w.b = keepId
    if (w.a === w.b) {
      // Parede que ligava os dois nós some (sem remover nós órfãos aqui: o nó mantido ainda é usado).
      for (const o of openingsOf(p, w.id)) delete p.openings[o.id]
      delete p.walls[w.id]
      continue
    }
    const dup = Object.values(p.walls).find(
      (o) => o.id !== w.id && ((o.a === w.a && o.b === w.b) || (o.a === w.b && o.b === w.a)),
    )
    if (dup) {
      // Mantém a parede que já existia; as aberturas da duplicada passam para ela.
      const centers = captureOpeningCenters(p, [w.id])
      reattachOpenings(p, centers, [dup.id])
      delete p.walls[w.id]
    }
  }
  delete p.nodes[removeId]
  removeOrphanNode(p, keepId)
}

/** As duas paredes ligadas ao nó, se forem exatamente duas e estiverem alinhadas. */
export function collinearPairAt(p: Project, nodeId: Id, angleTolDeg = 0.5): [Wall, Wall] | null {
  const ws = wallsAtNode(p, nodeId)
  if (ws.length !== 2) return null
  const [w1, w2] = ws as [Wall, Wall]
  const n = nodePos(p, nodeId)
  const d1 = normalize(sub(nodePos(p, otherNode(w1, nodeId)), n))
  const d2 = normalize(sub(nodePos(p, otherNode(w2, nodeId)), n))
  // Alinhadas = direções opostas a partir do nó.
  return dot(d1, d2) <= -Math.cos((angleTolDeg * Math.PI) / 180) ? [w1, w2] : null
}

/** Une as duas paredes alinhadas que se encontram no nó em uma só. Retorna a parede resultante. */
export function mergeWallsAtNode(p: Project, nodeId: Id): Id | null {
  const pair = collinearPairAt(p, nodeId)
  if (!pair) return null
  const [w1, w2] = pair
  const centers = captureOpeningCenters(p, [w1.id, w2.id])
  const x = otherNode(w1, nodeId)
  const y = otherNode(w2, nodeId)
  w1.a = x
  w1.b = y
  delete p.walls[w2.id]
  delete p.nodes[nodeId]
  reattachOpenings(p, centers, [w1.id])
  return w1.id
}

/** Une duas paredes alinhadas que compartilham um nó. */
export function mergeWalls(p: Project, wallA: Id, wallB: Id): Id | null {
  const a = p.walls[wallA]
  const b = p.walls[wallB]
  if (!a || !b) return null
  const shared = [a.a, a.b].find((n) => n === b.a || n === b.b)
  if (!shared) return null
  return mergeWallsAtNode(p, shared)
}

/** As paredes selecionadas podem ser unidas? (duas, alinhadas e com um nó só entre elas) */
export function canMergeWalls(p: Project, wallA: Id, wallB: Id): boolean {
  const a = p.walls[wallA]
  const b = p.walls[wallB]
  if (!a || !b) return false
  const shared = [a.a, a.b].find((n) => n === b.a || n === b.b)
  if (!shared) return false
  const pair = collinearPairAt(p, shared)
  return !!pair && pair.some((w) => w.id === wallA) && pair.some((w) => w.id === wallB)
}

/**
 * Remove um nó: se ele liga duas paredes alinhadas, elas viram uma só;
 * caso contrário, as paredes ligadas a ele são excluídas.
 */
export function deleteNode(p: Project, nodeId: Id): void {
  if (mergeWallsAtNode(p, nodeId)) return
  for (const w of wallsAtNode(p, nodeId)) deleteWall(p, w.id)
  delete p.nodes[nodeId]
}

// ---------------------------------------------------------------------------------------------
// Edição

export function setNodePositions(p: Project, positions: Record<Id, Point>): void {
  for (const [id, pos] of Object.entries(positions)) {
    const n = p.nodes[id]
    if (!n) continue
    const t = tidy(pos)
    n.x = t.x
    n.y = t.y
  }
}

/**
 * Posições dos nós para mover a parede em paralelo por `distance` (cm, no sentido da normal esquerda).
 * Quando a ponta tem exatamente uma parede vizinha não paralela, a vizinha estica/encolhe
 * mantendo a direção (como no Floorplanner); senão, a ponta apenas acompanha o deslocamento.
 */
export function parallelMovePositions(p: Project, wallId: Id, distance: number): Record<Id, Point> {
  const w = p.walls[wallId]
  if (!w) return {}
  const [A, B] = wallEnds(p, w)
  const d = normalize(sub(B, A))
  const offset = scale(perp(d), distance)
  const result: Record<Id, Point> = {}

  for (const nodeId of [w.a, w.b]) {
    const N = nodePos(p, nodeId)
    const moved = add(N, offset)
    const neighbors = wallsAtNode(p, nodeId).filter((o) => o.id !== wallId)
    if (neighbors.length === 1) {
      const nb = neighbors[0]!
      const O = nodePos(p, otherNode(nb, nodeId))
      const dirNb = sub(O, N)
      const hit = Math.abs(dot(normalize(dirNb), perp(d))) > 0.02 ? lineIntersection(moved, d, O, dirNb) : null
      result[nodeId] = hit ? hit.point : moved
    } else {
      result[nodeId] = moved
    }
  }
  return result
}

/** Paredes alinhadas em sequência com a dada (a mesma linha reta, mesmo que dividida em trechos por um T). */
export function collinearRun(p: Project, wallId: Id, angleTolDeg = 0.5): Id[] {
  const w = p.walls[wallId]
  if (!w) return []
  const [A, B] = wallEnds(p, w)
  const d = normalize(sub(B, A))
  const tol = Math.sin((angleTolDeg * Math.PI) / 180)
  const run = new Set<Id>([wallId])
  const stack = [w]
  while (stack.length > 0) {
    const cur = stack.pop()!
    for (const nodeId of [cur.a, cur.b]) {
      for (const o of wallsAtNode(p, nodeId)) {
        if (run.has(o.id)) continue
        const od = normalize(sub(nodePos(p, otherNode(o, nodeId)), nodePos(p, nodeId)))
        if (Math.abs(cross(od, d)) <= tol) {
          run.add(o.id)
          stack.push(o)
        }
      }
    }
  }
  return [...run]
}

/**
 * Move em paralelo a linha reta inteira da parede (todos os trechos alinhados), sem mudar nenhum ângulo:
 * em cada canto da linha, as paredes que chegam nela esticam ou encolhem na própria direção.
 * Num canto onde chegam paredes em direções diferentes, o canto apenas acompanha o deslocamento.
 */
export function runMovePositions(p: Project, wallId: Id, distance: number): Record<Id, Point> {
  const w = p.walls[wallId]
  if (!w) return {}
  const [A, B] = wallEnds(p, w)
  const d = normalize(sub(B, A))
  const offset = scale(perp(d), distance)
  const run = new Set(collinearRun(p, wallId))
  const result: Record<Id, Point> = {}
  for (const nodeId of nodesOfWalls(p, [...run])) {
    const N = nodePos(p, nodeId)
    const moved = add(N, offset)
    const others = wallsAtNode(p, nodeId).filter((o) => !run.has(o.id))
    // Direções (sem sentido) das paredes que chegam neste canto; paredes alinhadas entre si contam uma vez.
    const dirs: Point[] = []
    for (const o of others) {
      const od = normalize(sub(nodePos(p, otherNode(o, nodeId)), N))
      if (!dirs.some((x) => Math.abs(cross(x, od)) < 1e-3)) dirs.push(od)
    }
    const only = dirs.length === 1 ? dirs[0]! : null
    const hit = only && Math.abs(dot(only, perp(d))) > 0.02 ? lineIntersection(moved, d, N, only) : null
    result[nodeId] = hit ? hit.point : moved
  }
  return result
}

export type LengthAnchor = 'start' | 'center' | 'end'

/** Novas posições das pontas para a parede ter `length` cm, mantendo fixa a âncora escolhida. */
export function setWallLengthPositions(p: Project, wallId: Id, length: number, anchor: LengthAnchor): Record<Id, Point> {
  const w = p.walls[wallId]
  if (!w) return {}
  const L = Math.max(1, length)
  const [A, B] = wallEnds(p, w)
  const d = normalize(sub(B, A))
  if (anchor === 'start') return { [w.b]: add(A, scale(d, L)) }
  if (anchor === 'end') return { [w.a]: sub(B, scale(d, L)) }
  const M = scale(add(A, B), 0.5)
  return { [w.a]: sub(M, scale(d, L / 2)), [w.b]: add(M, scale(d, L / 2)) }
}

/** Nós usados pelas paredes. */
export function nodesOfWalls(p: Project, wallIds: Id[]): Id[] {
  const s = new Set<Id>()
  for (const id of wallIds) {
    const w = p.walls[id]
    if (w) {
      s.add(w.a)
      s.add(w.b)
    }
  }
  return [...s]
}

/**
 * Depois de mover nós, liga o que passou a se tocar: nós sobre outros nós são fundidos
 * e nós sobre o meio de paredes dividem essas paredes.
 */
export function connectMovedNodes(p: Project, nodeIds: Id[]): void {
  for (const id of nodeIds) {
    const n = p.nodes[id]
    if (!n) continue
    const other = findNodeAt(p, n, NODE_TOL, [id])
    if (other) {
      mergeNodes(p, other, id)
      continue
    }
    const own = wallsAtNode(p, id).map((w) => w.id)
    const onWall = findWallAt(p, n, NODE_TOL, own)
    if (onWall) {
      const t = tidy(onWall.point)
      n.x = t.x
      n.y = t.y
      const created = splitWall(p, onWall.wallId, onWall.point)
      mergeNodes(p, id, created)
    }
  }
}
