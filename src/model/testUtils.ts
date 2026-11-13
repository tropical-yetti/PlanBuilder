import { createEmptyProject } from './project'
import type { Point, Project } from './types'
import { wallEnds } from './walls'

export const emptyProject = (): Project => createEmptyProject('Teste', new Date('2026-01-01T00:00:00Z'))

/** Segmentos das paredes como "x1,y1-x2,y2" ordenados (independente de ids e da direção). */
export function segments(p: Project): string[] {
  const fmt = (q: Point) => `${Math.round(q.x * 100) / 100},${Math.round(q.y * 100) / 100}`
  return Object.values(p.walls)
    .map((w) => {
      const [a, b] = wallEnds(p, w).map(fmt).sort()
      return `${a}-${b}`
    })
    .sort()
}

export const counts = (p: Project) => ({
  nodes: Object.keys(p.nodes).length,
  walls: Object.keys(p.walls).length,
})
