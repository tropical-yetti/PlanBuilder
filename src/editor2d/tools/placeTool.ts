import { getComponent } from '../../library/registry'
import { angleOf, dot, normalize, perp, projectOnSegment, sub } from '../../model/geometry'
import { addOpening, clampOffset, isOpeningValid } from '../../model/openings'
import { wallEnds, wallLength } from '../../model/walls'
import type { Id, Point, Project } from '../../model/types'
import type { OpeningDraft } from '../interactionStore'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool } from './types'

/** Distância (px) até a face da parede em que o componente já "gruda" nela. */
const ATTACH_PX = 40
/** Distância (px) para grudar no centro da parede. */
const CENTER_PX = 8

/** Parede mais próxima do ponto, se estiver ao alcance. */
export function nearestWall(p: Project, point: Point, k: number, reachPx = ATTACH_PX): { wallId: Id; t: number; point: Point } | null {
  let best: { wallId: Id; t: number; point: Point; d: number } | null = null
  for (const w of Object.values(p.walls)) {
    const [a, b] = wallEnds(p, w)
    const pr = projectOnSegment(point, a, b)
    const d = Math.max(0, pr.distance - w.thickness / 2)
    if (d <= reachPx / k && (!best || pr.distance < best.d)) best = { wallId: w.id, t: pr.t, point: pr.point, d: pr.distance }
  }
  return best
}

/** Posição ao longo da parede para o cursor: arredonda a 1 cm e gruda no centro da parede. */
export function snapOffset(p: Project, wallId: Id, rawOffset: number, width: number, k: number, alt: boolean): number | null {
  const w = p.walls[wallId]
  if (!w) return null
  const L = wallLength(p, w)
  let off = rawOffset
  if (!alt) {
    off = Math.round(off)
    if (Math.abs(off - L / 2) <= CENTER_PX / k) off = L / 2
  }
  return clampOffset(p, wallId, off, width)
}

/**
 * Inserção de componentes da biblioteca: o componente segue o cursor, gruda na parede mais próxima
 * e abre para o lado em que o cursor está. Clique insere; F inverte a dobradiça; Esc sai.
 */
export function createPlaceTool(): Tool {
  let flipHinge = false
  let lastSide = false
  let last: PointerInfo | null = null

  function compute(e: PointerInfo): OpeningDraft | null {
    const id = editor().placing
    if (!id) return null
    const def = getComponent(id)
    const p = project()
    const k = pxPerCm()
    const width = def.defaults.width
    const base = { kind: 'opening' as const, componentId: id, width, flipHinge }

    const near = nearestWall(p, e.world, k)
    const wall = near && p.walls[near.wallId]
    if (!near || !wall) {
      return { ...base, wallId: null, at: e.world, angle: 0, offset: 0, thickness: p.settings.defaultWallThickness, flipSide: lastSide, valid: false }
    }
    const [a, b] = wallEnds(p, wall)
    const dir = normalize(sub(b, a))
    const L = wallLength(p, wall)
    const offset = snapOffset(p, wall.id, near.t * L, width, k, e.alt)
    // Abre para o lado em que o cursor está (com folga, para não ficar piscando em cima do eixo).
    const side = dot(sub(e.world, near.point), perp(dir))
    if (def.sided && Math.abs(side) > 2 / k) lastSide = side < 0
    const off = offset ?? near.t * L
    return {
      ...base,
      wallId: wall.id,
      at: { x: a.x + dir.x * off, y: a.y + dir.y * off },
      angle: (angleOf(dir) * 180) / Math.PI,
      offset: off,
      thickness: wall.thickness,
      flipSide: def.sided ? lastSide : false,
      valid: offset !== null && isOpeningValid(p, wall.id, offset, width),
    }
  }

  return {
    cursor: () => {
      const d = ui().draft
      return d?.kind === 'opening' && d.wallId && !d.valid ? 'not-allowed' : 'copy'
    },

    onPointerMove(e) {
      last = e
      ui().set({ cursor: e.world, draft: compute(e) })
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      last = e
      const d = compute(e)
      if (!d || !d.wallId || !d.valid) return
      const def = getComponent(d.componentId)
      const wallId = d.wallId
      let created: Id | null = null
      docStore().update(def.category === 'doors' ? 'Porta inserida' : 'Janela inserida', (doc) => {
        created = addOpening(doc, {
          wallId,
          componentId: def.id,
          offset: d.offset,
          width: d.width,
          height: def.defaults.height,
          sillHeight: def.defaults.sillHeight,
          flipSide: d.flipSide,
          flipHinge: d.flipHinge,
          params: { ...def.defaults.params },
        })
      })
      if (created) editor().setSelection([created])
      ui().set({ draft: compute(e) })
    },

    onKeyDown(e) {
      if (e.key === 'Escape') {
        editor().setTool('select')
        return true
      }
      if (e.key.toLowerCase() === 'f') {
        flipHinge = !flipHinge
        if (last) ui().set({ draft: compute(last) })
        return true
      }
      return false
    },

    onDeactivate() {
      flipHinge = false
      last = null
      ui().set({ draft: null })
    },
  }
}
