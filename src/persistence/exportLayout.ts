import { dimensionGeometry, textCorners } from '../model/annotations'
import { boundsOf, type Rect } from '../model/geometry'
import { wallPolygons } from '../model/wallGeometry'
import { openingCenter } from '../model/walls'
import type { Point, Project } from '../model/types'

export interface ExportOptions {
  grid: boolean
  /** Comprimento de cada parede. */
  wallLengths: boolean
  /** Nomes e áreas dos cômodos. */
  roomLabels: boolean
  /** Quadro de áreas abaixo do desenho. */
  areaTable: boolean
  /** Multiplicador de resolução (2 = boa para tela, 4 = boa para impressão). */
  pixelRatio: 2 | 4
}

export const DEFAULT_EXPORT: ExportOptions = { grid: false, wallLengths: true, roomLabels: true, areaTable: false, pixelRatio: 2 }

/** Margem em volta do desenho, em pixels da imagem base. */
const MARGIN_PX = 48
/** Lado máximo da imagem final: acima disso os navegadores podem falhar ao criar o canvas. */
export const MAX_SIDE = 8192

/** Tudo o que precisa caber na imagem: paredes, o giro das portas, cotas e textos. */
export function contentBounds(p: Project): Rect | null {
  const pts: Point[] = [...wallPolygons(p).values()].flatMap((w) => w.points)
  for (const o of Object.values(p.openings)) {
    if (!p.walls[o.wallId]) continue
    const c = openingCenter(p, o)
    // A folha aberta alcança até a largura do vão para fora da parede, em qualquer direção.
    pts.push({ x: c.x - o.width, y: c.y - o.width }, { x: c.x + o.width, y: c.y + o.width })
  }
  for (const t of Object.values(p.texts)) pts.push(...textCorners(t))
  for (const d of Object.values(p.dimensions)) {
    const g = dimensionGeometry(d)
    pts.push(d.p1, d.p2, g.a, g.b)
  }
  return boundsOf(pts)
}

export interface ExportLayout {
  /** Pixels por centímetro na imagem base (antes do multiplicador de resolução). */
  scale: number
  /** Tamanho da imagem base em pixels. */
  width: number
  height: number
  /** Posição do mundo na imagem: tela = mundo × scale + (x, y). */
  x: number
  y: number
}

/**
 * Enquadra o desenho inteiro com margem. A escala é escolhida para a imagem base ficar com cerca de
 * 1000 px no maior lado: plantas pequenas são ampliadas e plantas grandes, reduzidas, sempre legíveis.
 */
export function exportLayout(p: Project): ExportLayout | null {
  const b = contentBounds(p)
  if (!b) return null
  const w = Math.max(b.maxX - b.minX, 50)
  const h = Math.max(b.maxY - b.minY, 50)
  const scale = Math.min(3, Math.max(0.2, 1000 / Math.max(w, h)))
  return {
    scale,
    width: Math.ceil(w * scale + 2 * MARGIN_PX),
    height: Math.ceil(h * scale + 2 * MARGIN_PX),
    x: MARGIN_PX - b.minX * scale,
    y: MARGIN_PX - b.minY * scale,
  }
}

/** Reduz o multiplicador de resolução se a imagem final passar do tamanho máximo. */
export function safePixelRatio(wanted: number, width: number, height: number): number {
  return Math.min(wanted, MAX_SIDE / Math.max(width, height))
}
