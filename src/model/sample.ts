/** Projeto de exemplo oferecido na primeira abertura: uma casa pequena para explorar o app. */
import { addOpening } from './openings'
import { createEmptyProject, newId } from './project'
import type { Point, Project } from './types'
import { drawRectRoom, drawWallSegment, findWallAt, nodePos } from './walls'

function place(p: Project, at: Point, componentId: string, width: number, height: number, sillHeight: number, extra: { flipSide?: boolean; flipHinge?: boolean; params?: Record<string, unknown> } = {}) {
  const hit = findWallAt(p, at, 1)
  const w = hit && p.walls[hit.wallId]
  if (!w) return
  const a = nodePos(p, w.a)
  addOpening(p, {
    wallId: w.id,
    componentId,
    offset: Math.hypot(at.x - a.x, at.y - a.y),
    width,
    height,
    sillHeight,
    flipSide: extra.flipSide ?? false,
    flipHinge: extra.flipHinge ?? false,
    params: extra.params ?? {},
  })
}

function label(p: Project, x: number, y: number, name: string) {
  const id = newId()
  p.roomLabels[id] = { id, x, y, name }
}

export function createSampleProject(): Project {
  const p = createEmptyProject('Casa de exemplo')
  // Contorno de 8 × 6 m e as divisões internas
  drawRectRoom(p, { x: 0, y: 0 }, { x: 800, y: 600 })
  drawWallSegment(p, { x: 450, y: 0 }, { x: 450, y: 600 })
  drawWallSegment(p, { x: 450, y: 350 }, { x: 800, y: 350 })
  drawWallSegment(p, { x: 0, y: 380 }, { x: 250, y: 380 })
  drawWallSegment(p, { x: 250, y: 380 }, { x: 250, y: 600 })

  // Portas: abrem para dentro de cada cômodo (o lado depende do sentido em que a parede foi criada)
  const door = (at: Point, inside: Point, width = 80) => {
    const hit = findWallAt(p, at, 1)
    const w = hit && p.walls[hit.wallId]
    if (!w) return
    const a = nodePos(p, w.a)
    const b = nodePos(p, w.b)
    // normal esquerda da parede: se aponta para o lado de dentro, não precisa inverter
    const side = -(b.y - a.y) * (inside.x - at.x) + (b.x - a.x) * (inside.y - at.y)
    place(p, at, width > 100 ? 'door.swing-double' : 'door.swing-single', width, 210, 0, { flipSide: side < 0 })
  }
  door({ x: 340, y: 600 }, { x: 340, y: 500 }, 90) // entrada
  door({ x: 450, y: 120 }, { x: 550, y: 120 }) // quarto
  door({ x: 450, y: 470 }, { x: 550, y: 470 }) // cozinha
  door({ x: 250, y: 490 }, { x: 150, y: 490 }, 70) // banheiro

  // Janelas
  place(p, { x: 200, y: 0 }, 'window.sliding', 200, 120, 100, { params: { leaves: 4 } })
  place(p, { x: 620, y: 0 }, 'window.sliding', 150, 120, 100, { params: { leaves: 2 } })
  place(p, { x: 800, y: 480 }, 'window.casement', 100, 120, 100)
  place(p, { x: 120, y: 600 }, 'window.tilt', 60, 60, 160)

  label(p, 220, 180, 'Sala')
  label(p, 625, 170, 'Quarto')
  label(p, 625, 475, 'Cozinha')
  label(p, 120, 490, 'Banheiro')
  return p
}
