/** Móveis e objetos soltos no cômodo. As funções alteram o projeto no lugar (uso dentro de `update`). */
import { add, dist, dot, normalize, perp, projectOnSegment, scale, sub } from './geometry'
import { newId } from './project'
import type { Id, Item, Point, Project } from './types'
import { wallEnds } from './walls'

export type NewItem = Omit<Item, 'id'>

export function addItem(p: Project, data: NewItem): Id {
  const id = newId()
  p.items[id] = { ...data, id, x: round(data.x), y: round(data.y), rotation: normalizeAngle(data.rotation) }
  return id
}

const round = (v: number) => Math.round(v * 100) / 100

/** Ângulo entre 0 e 360, com resíduos de ponto flutuante removidos. */
export function normalizeAngle(deg: number): number {
  const a = ((deg % 360) + 360) % 360
  const r = Math.round(a * 1000) / 1000
  return r === 360 ? 0 : r
}

/** Cantos do móvel, em ordem: fundo esquerdo, fundo direito, frente direita, frente esquerda. */
export function itemCorners(it: Pick<Item, 'x' | 'y' | 'width' | 'depth' | 'rotation'>): Point[] {
  const rad = (it.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [
    [-it.width / 2, -it.depth / 2],
    [it.width / 2, -it.depth / 2],
    [it.width / 2, it.depth / 2],
    [-it.width / 2, it.depth / 2],
  ].map(([x, y]) => ({ x: it.x + x! * cos - y! * sin, y: it.y + x! * sin + y! * cos }))
}

/** Ponto do mundo no sistema local do móvel (x na largura, y na profundidade). */
export function toItemLocal(it: Pick<Item, 'x' | 'y' | 'rotation'>, q: Point): Point {
  const rad = (-it.rotation * Math.PI) / 180
  const dx = q.x - it.x
  const dy = q.y - it.y
  return { x: dx * Math.cos(rad) - dy * Math.sin(rad), y: dx * Math.sin(rad) + dy * Math.cos(rad) }
}

export function pointInItem(it: Item, q: Point, round: boolean, tol = 0): boolean {
  const l = toItemLocal(it, q)
  if (round) return Math.hypot(l.x / (it.width / 2 + tol), l.y / (it.depth / 2 + tol)) <= 1
  return Math.abs(l.x) <= it.width / 2 + tol && Math.abs(l.y) <= it.depth / 2 + tol
}

export interface WallSnap {
  x: number
  y: number
  rotation: number
  wallId: Id
}

/**
 * Encosta o fundo do móvel na face da parede mais próxima: gira para o fundo ficar voltado para a parede
 * e posiciona o móvel colado na face. Só acontece se o fundo estiver a menos de `reach` cm da face e o
 * móvel estiver ao lado da parede (não além das pontas).
 */
export function snapToWall(p: Project, center: Point, depth: number, reach: number): WallSnap | null {
  let best: (WallSnap & { gap: number }) | null = null
  for (const w of Object.values(p.walls)) {
    const [a, b] = wallEnds(p, w)
    const pr = projectOnSegment(center, a, b)
    if (pr.t <= 0 || pr.t >= 1) continue
    const along = normalize(sub(b, a))
    const n = perp(along)
    const side = dot(sub(center, pr.point), n) >= 0 ? 1 : -1
    // distância do fundo do móvel até a face da parede, do lado em que o móvel está
    const gap = Math.abs(dist(center, pr.point) - w.thickness / 2 - depth / 2)
    if (gap > reach || (best && gap >= best.gap)) continue
    const outward = scale(n, side) // da parede para o lado do móvel = direção da frente
    const c = add(pr.point, scale(outward, w.thickness / 2 + depth / 2))
    // rotação 0 = frente para +y; a frente deve apontar para `outward`
    const rotation = normalizeAngle((Math.atan2(-outward.x, outward.y) * 180) / Math.PI)
    best = { x: round(c.x), y: round(c.y), rotation, wallId: w.id, gap }
  }
  if (!best) return null
  const { gap: _gap, ...snap } = best
  void _gap
  return snap
}

/**
 * Muda as medidas do móvel. Em móveis que encostam na parede (sofá, cama), o fundo fica onde está e
 * o móvel cresce ou encolhe só para a frente: uma cama trocada por uma maior não entra na parede.
 * Nos demais (mesas), o centro fica no lugar.
 */
export function resizeItem(it: Item, size: { width?: number; depth?: number }, keepBack: boolean): void {
  const depth = size.depth ?? it.depth
  if (keepBack && depth !== it.depth) {
    const rad = (it.rotation * Math.PI) / 180
    const shift = (depth - it.depth) / 2
    // frente do móvel = +y local, que no mundo aponta para (−sen θ, cos θ)
    it.x = round(it.x - Math.sin(rad) * shift)
    it.y = round(it.y + Math.cos(rad) * shift)
  }
  if (size.width !== undefined) it.width = size.width
  it.depth = depth
}
