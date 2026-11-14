import { getComponent, getDef, getItem } from '../../library/registry'
import type { ItemDef } from '../../library/types'
import { addItem, normalizeAngle, snapToWall } from '../../model/items'
import { angleOf, dot, normalize, perp, projectOnSegment, sub } from '../../model/geometry'
import { addOpening, clampOffset, isOpeningValid } from '../../model/openings'
import { wallEnds, wallLength } from '../../model/walls'
import type { Id, Point, Project } from '../../model/types'
import type { ItemDraft, OpeningDraft } from '../interactionStore'
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

/** Distância (px) entre o fundo do móvel e a face da parede em que ele encosta sozinho. */
export const ITEM_ATTACH_PX = 30

/**
 * Posição de um móvel para o cursor: encosta na parede (se o componente pede e o cursor está perto)
 * ou fica solto, com o centro arredondado a 1 cm e a rotação escolhida. Alt desliga o encostar.
 */
export function placeItem(
  p: Project,
  def: Pick<ItemDef, 'againstWall'>,
  center: Point,
  size: { depth: number },
  rotation: number,
  k: number,
  alt: boolean,
): { x: number; y: number; rotation: number; attached: boolean } {
  if (def.againstWall && !alt) {
    const snap = snapToWall(p, center, size.depth, ITEM_ATTACH_PX / k)
    if (snap) return { x: snap.x, y: snap.y, rotation: snap.rotation, attached: true }
  }
  const step = alt ? 0.01 : 1
  return { x: Math.round(center.x / step) * step, y: Math.round(center.y / step) * step, rotation, attached: false }
}

/**
 * Inserção de componentes da biblioteca.
 * - Portas, janelas e cobogós seguem o cursor, grudam na parede mais próxima e abrem para o lado do cursor.
 *   F inverte a dobradiça.
 * - Móveis seguem o cursor; sofás, camas e poltronas encostam o fundo na parede mais próxima. R gira 90°.
 * Clique insere (dá para inserir vários seguidos); Esc sai.
 */
export function createPlaceTool(): Tool {
  let flipHinge = false
  let lastSide = false
  /** Giro escolhido com R para móveis soltos. */
  let itemRotation = 0
  let last: PointerInfo | null = null

  function computeItem(e: PointerInfo, def: ItemDef): ItemDraft {
    const pos = placeItem(project(), def, e.world, { depth: def.defaults.depth }, itemRotation, pxPerCm(), e.alt)
    return { kind: 'item', componentId: def.id, width: def.defaults.width, depth: def.defaults.depth, ...pos }
  }

  function compute(e: PointerInfo): OpeningDraft | ItemDraft | null {
    const id = editor().placing
    if (!id) return null
    const any = getDef(id)
    if (any?.kind === 'item') return computeItem(e, any)
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

  const insertLabel = (category: string) =>
    category === 'doors' ? 'Porta inserida' : category === 'windows' ? 'Janela inserida' : category === 'cobogo' ? 'Cobogó inserido' : 'Móvel inserido'

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
      if (!d) return
      let created: Id | null = null

      if (d.kind === 'item') {
        const def = getItem(d.componentId)
        docStore().update(insertLabel(def.category), (doc) => {
          created = addItem(doc, {
            componentId: def.id,
            x: d.x,
            y: d.y,
            rotation: d.rotation,
            width: def.defaults.width,
            depth: def.defaults.depth,
            height: def.defaults.height,
            mirrored: false,
            params: { ...def.defaults.params },
          })
        })
      } else {
        if (!d.wallId || !d.valid) return
        const def = getComponent(d.componentId)
        const wallId = d.wallId
        const wallHeight = project().walls[wallId]!.height
        docStore().update(insertLabel(def.category), (doc) => {
          created = addOpening(doc, {
            wallId,
            componentId: def.id,
            offset: d.offset,
            width: d.width,
            // Painéis de cobogó sobem do peitoril até o topo da parede em que entram.
            height: def.fullHeight ? Math.max(def.limits.minHeight, wallHeight - def.defaults.sillHeight) : def.defaults.height,
            sillHeight: def.defaults.sillHeight,
            flipSide: d.flipSide,
            flipHinge: d.flipHinge,
            params: { ...def.defaults.params },
          })
        })
      }
      if (created) editor().setSelection([created])
      ui().set({ draft: compute(e) })
    },

    onKeyDown(e) {
      if (e.key === 'Escape') {
        editor().setTool('select')
        return true
      }
      const isItem = getDef(editor().placing ?? '')?.kind === 'item'
      if (!isItem && e.key.toLowerCase() === 'f') {
        flipHinge = !flipHinge
        if (last) ui().set({ draft: compute(last) })
        return true
      }
      if (isItem && e.key.toLowerCase() === 'r') {
        itemRotation = normalizeAngle(itemRotation + (e.shift ? -90 : 90))
        if (last) ui().set({ draft: compute(last) })
        return true
      }
      return false
    },

    onDeactivate() {
      flipHinge = false
      itemRotation = 0
      last = null
      ui().set({ draft: null })
    },
  }
}
