/** Geometria 2D básica. Medidas em centímetros; y cresce para baixo (como na tela). */

import type { Point } from './types'

export const EPS = 1e-6

export const pt = (x: number, y: number): Point => ({ x, y })
export const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k })
export const dot = (a: Point, b: Point): number => a.x * b.x + a.y * b.y
export const cross = (a: Point, b: Point): number => a.x * b.y - a.y * b.x
export const len = (a: Point): number => Math.hypot(a.x, a.y)
export const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
export const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
export const midpoint = (a: Point, b: Point): Point => lerp(a, b, 0.5)
/** Perpendicular, girada 90° no sentido anti-horário matemático. */
export const perp = (a: Point): Point => ({ x: -a.y, y: a.x })
export const samePoint = (a: Point, b: Point, tol = 1e-3): boolean => dist(a, b) <= tol

export function normalize(a: Point): Point {
  const l = len(a)
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l }
}

/** Ângulo do vetor em radianos, de -π a π. */
export const angleOf = (a: Point): number => Math.atan2(a.y, a.x)

export const fromAngle = (rad: number, length = 1): Point => ({ x: Math.cos(rad) * length, y: Math.sin(rad) * length })

export interface Projection {
  /** Ponto mais próximo no segmento. */
  point: Point
  /** Posição relativa no segmento (0 = início, 1 = fim), limitada a [0, 1]. */
  t: number
  /** Distância do ponto original ao segmento. */
  distance: number
}

export function projectOnSegment(p: Point, a: Point, b: Point): Projection {
  const ab = sub(b, a)
  const l2 = dot(ab, ab)
  const t = l2 < EPS ? 0 : Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2))
  const point = lerp(a, b, t)
  return { point, t, distance: dist(p, point) }
}

/** Interseção de duas retas infinitas (p1 + t·d1 e p2 + u·d2). Null se forem paralelas. */
export function lineIntersection(p1: Point, d1: Point, p2: Point, d2: Point): { point: Point; t: number; u: number } | null {
  const den = cross(d1, d2)
  if (Math.abs(den) < EPS * Math.max(1, len(d1) * len(d2))) return null
  const w = sub(p2, p1)
  const t = cross(w, d2) / den
  const u = cross(w, d1) / den
  return { point: add(p1, scale(d1, t)), t, u }
}

/**
 * Interseção de dois segmentos. Retorna t (posição no primeiro) e u (no segundo), ambos em [0, 1].
 * Segmentos paralelos/colineares retornam null.
 */
export function segmentIntersection(a1: Point, a2: Point, b1: Point, b2: Point): { point: Point; t: number; u: number } | null {
  const hit = lineIntersection(a1, sub(a2, a1), b1, sub(b2, b1))
  if (!hit) return null
  const e = 1e-9
  if (hit.t < -e || hit.t > 1 + e || hit.u < -e || hit.u > 1 + e) return null
  return hit
}

/** Área com sinal (fórmula do laço). Positiva no sentido horário da tela (y para baixo). */
export function signedArea(poly: Point[]): number {
  let s = 0
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]!
    const b = poly[(i + 1) % poly.length]!
    s += a.x * b.y - b.x * a.y
  }
  return s / 2
}

export const polygonArea = (poly: Point[]): number => Math.abs(signedArea(poly))

export function pointInPolygon(p: Point, poly: Point[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

export interface Rect {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export function rectFromPoints(a: Point, b: Point): Rect {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) }
}

export const pointInRect = (p: Point, r: Rect): boolean => p.x >= r.minX && p.x <= r.maxX && p.y >= r.minY && p.y <= r.maxY

/** O segmento toca o retângulo (cruza uma borda ou está dentro)? */
export function segmentIntersectsRect(a: Point, b: Point, r: Rect): boolean {
  if (pointInRect(a, r) || pointInRect(b, r)) return true
  const c = [pt(r.minX, r.minY), pt(r.maxX, r.minY), pt(r.maxX, r.maxY), pt(r.minX, r.maxY)]
  for (let i = 0; i < 4; i++) {
    if (segmentIntersection(a, b, c[i]!, c[(i + 1) % 4]!)) return true
  }
  return false
}

export function boundsOf(points: Point[]): Rect | null {
  if (points.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  return { minX, minY, maxX, maxY }
}

/** Arredonda para o múltiplo mais próximo de `step`. */
export const roundTo = (v: number, step: number): number => (step > 0 ? Math.round(v / step) * step : v)

/** Arredonda coordenadas a 0,01 cm para evitar ruído de ponto flutuante no documento. */
export const tidy = (p: Point): Point => ({ x: Math.round(p.x * 100) / 100, y: Math.round(p.y * 100) / 100 })
