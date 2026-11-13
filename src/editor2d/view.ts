import { boundsOf } from '../model/geometry'
import { wallPolygons } from '../model/wallGeometry'
import type { Project } from '../model/types'
import { MAX_SCALE, MIN_SCALE, type View2D } from '../store/editorStore'

/** Escala inicial: 1 pixel por centímetro (um cômodo de 4 m ocupa 400 px). */
export const DEFAULT_SCALE = 1

/** Vista que enquadra todo o desenho com margem; sem desenho, centraliza a origem. */
export function fitView(p: Project, size: { width: number; height: number }, paddingPx = 60): View2D {
  const pts = [...wallPolygons(p).values()].flatMap((w) => w.points)
  const b = boundsOf(pts)
  if (!b || size.width === 0) return { scale: DEFAULT_SCALE, x: size.width / 2, y: size.height / 2 }
  const w = Math.max(b.maxX - b.minX, 100)
  const h = Math.max(b.maxY - b.minY, 100)
  const scale = Math.min(
    MAX_SCALE,
    Math.max(MIN_SCALE, Math.min((size.width - 2 * paddingPx) / w, (size.height - 2 * paddingPx) / h)),
  )
  const cx = (b.minX + b.maxX) / 2
  const cy = (b.minY + b.maxY) / 2
  return { scale, x: size.width / 2 - cx * scale, y: size.height / 2 - cy * scale }
}

/** Zoom 100% mantendo o centro da tela. */
export function zoom100(v: View2D, size: { width: number; height: number }): View2D {
  const cx = (size.width / 2 - v.x) / v.scale
  const cy = (size.height / 2 - v.y) / v.scale
  return { scale: DEFAULT_SCALE, x: size.width / 2 - cx * DEFAULT_SCALE, y: size.height / 2 - cy * DEFAULT_SCALE }
}
