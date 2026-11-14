/** Utilidades das primitivas de símbolo, comuns à planta (Konva), às miniaturas (SVG) e à exportação. */
import type { Prim, PrimFill } from './types'

/** Cores de preenchimento dos símbolos. */
export const FILL_COLORS: Record<PrimFill, string> = {
  leaf: '#ffffff',
  glass: '#dbeafe',
  solid: '#ffffff',
  soft: '#eceff3',
  wood: '#f1e6d6',
  concrete: '#e7e2d8',
}

export interface PrimBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

/** Retângulo que contém todas as primitivas (arcos contam o círculo inteiro, por simplicidade). */
export function primBounds(prims: Prim[]): PrimBounds | null {
  let b: PrimBounds | null = null
  const add = (x: number, y: number) => {
    if (!b) b = { minX: x, minY: y, maxX: x, maxY: y }
    else {
      b.minX = Math.min(b.minX, x)
      b.minY = Math.min(b.minY, y)
      b.maxX = Math.max(b.maxX, x)
      b.maxY = Math.max(b.maxY, y)
    }
  }
  for (const p of prims) {
    if (p.t === 'line') for (let i = 0; i < p.pts.length; i += 2) add(p.pts[i]!, p.pts[i + 1]!)
    else if (p.t === 'arc' || p.t === 'circle') {
      add(p.cx - p.r, p.cy - p.r)
      add(p.cx + p.r, p.cy + p.r)
    } else {
      add(p.x, p.y)
      add(p.x + p.w, p.y + p.h)
    }
  }
  return b
}

/** Todos os números de uma primitiva (para conferir nos testes que nada é NaN). */
export function primNumbers(p: Prim): number[] {
  if (p.t === 'line') return p.pts
  if (p.t === 'arc') return [p.cx, p.cy, p.r, p.a0, p.a1]
  if (p.t === 'circle') return [p.cx, p.cy, p.r]
  return [p.x, p.y, p.w, p.h, p.r ?? 0]
}
