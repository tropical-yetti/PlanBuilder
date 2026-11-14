import { angleOf, normalize, sub } from '../model/geometry'
import type { Id, Point, Project } from '../model/types'

export interface OpeningShape {
  key: string
  componentId: string
  at: Point
  /** Ângulo da parede em graus. */
  angle: number
  width: number
  thickness: number
  flipSide: boolean
  flipHinge: boolean
  params: Record<string, unknown>
  color: string
  /** Prévia (inserção): desenhada translúcida. */
  ghost?: boolean
}

/** Dados de desenho das aberturas do projeto. */
export function openingShapes(project: Project, colorOf: (id: Id) => string): OpeningShape[] {
  const shapes: OpeningShape[] = []
  for (const o of Object.values(project.openings)) {
    const w = project.walls[o.wallId]
    const a = w && project.nodes[w.a]
    const b = w && project.nodes[w.b]
    if (!w || !a || !b) continue
    const dir = normalize(sub(b, a))
    shapes.push({
      key: o.id,
      componentId: o.componentId,
      at: { x: a.x + dir.x * o.offset, y: a.y + dir.y * o.offset },
      angle: (angleOf(dir) * 180) / Math.PI,
      width: o.width,
      thickness: w.thickness,
      flipSide: o.flipSide,
      flipHinge: o.flipHinge,
      params: o.params,
      color: colorOf(o.id),
    })
  }
  return shapes
}

