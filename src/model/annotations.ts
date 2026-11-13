/** Cotas manuais e textos (anotações livres na planta). */
import { add, dist, midpoint, normalize, perp, scale, sub } from './geometry'
import { newId } from './project'
import type { Dimension, Id, Point, Project, TextNote } from './types'

export const DEFAULT_TEXT_SIZE = 20
export const DEFAULT_DIMENSION_OFFSET = 30

export function addDimension(p: Project, p1: Point, p2: Point, offset = DEFAULT_DIMENSION_OFFSET): Id | null {
  if (dist(p1, p2) < 1) return null
  const id = newId()
  p.dimensions[id] = { id, p1: { ...p1 }, p2: { ...p2 }, offset: Math.round(offset) }
  return id
}

export function addText(p: Project, at: Point, text: string, size = DEFAULT_TEXT_SIZE): Id | null {
  const clean = text.trim()
  if (clean === '') return null
  const id = newId()
  p.texts[id] = { id, x: at.x, y: at.y, text: clean, size, rotation: 0 }
  return id
}

/** Geometria de uma cota: a linha de medida fica afastada `offset` dos pontos medidos. */
export function dimensionGeometry(d: Pick<Dimension, 'p1' | 'p2' | 'offset'>): { a: Point; b: Point; mid: Point; length: number; normal: Point } {
  const normal = perp(normalize(sub(d.p2, d.p1)))
  const shift = scale(normal, d.offset)
  const a = add(d.p1, shift)
  const b = add(d.p2, shift)
  return { a, b, mid: midpoint(a, b), length: dist(d.p1, d.p2), normal }
}

/** Afastamento (com sinal) para a linha de cota passar pelo ponto dado. */
export function offsetToPoint(p1: Point, p2: Point, at: Point): number {
  const normal = perp(normalize(sub(p2, p1)))
  const v = sub(at, p1)
  return Math.round(v.x * normal.x + v.y * normal.y)
}

/** Tamanho aproximado do texto em cm (largura estimada pela quantidade de letras). */
export function textSize(t: Pick<TextNote, 'text' | 'size'>): { width: number; height: number } {
  const lines = t.text.split('\n')
  const longest = Math.max(...lines.map((l) => l.length), 1)
  return { width: longest * t.size * 0.56, height: lines.length * t.size * 1.2 }
}

/** Cantos do retângulo do texto (centrado em x,y e girado). */
export function textCorners(t: TextNote): Point[] {
  const { width, height } = textSize(t)
  const rad = (t.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return [
    [-width / 2, -height / 2],
    [width / 2, -height / 2],
    [width / 2, height / 2],
    [-width / 2, height / 2],
  ].map(([x, y]) => ({ x: t.x + x! * cos - y! * sin, y: t.y + x! * sin + y! * cos }))
}
