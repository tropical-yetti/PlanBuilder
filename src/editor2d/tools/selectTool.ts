import { dist, dot, normalize, perp, sub } from '../../model/geometry'
import { fitOpeningsToWalls, moveOpening } from '../../model/openings'
import { roomAt } from '../../model/quantities'
import { classify, isLocked } from '../../model/selection'
import { settleSelection, shiftSelection } from '../../model/transforms'
import { connectMovedNodes, nodePos, openingCenter, otherNode, parallelMovePositions, setNodePositions, splitWall, wallEnds, wallLength, wallsAtNode } from '../../model/walls'
import type { Id, Point, Project } from '../../model/types'
import { hitTest, hitWall, objectsInBox } from '../hitTest'
import { snapPoint } from '../snapping'
import { docStore, editor, project, pxPerCm, ui } from './context'
import { nearestWall, snapOffset } from './placeTool'
import type { PointerInfo, Tool } from './types'

type Mode = 'idle' | 'node' | 'wall' | 'opening' | 'move' | 'box' | 'none'

/** Distância mínima (px) para um clique virar arraste. */
const DRAG_PX = 4

/**
 * Selecionar: clique seleciona; Shift+clique adiciona/remove; arrastar no vazio faz caixa de seleção.
 * - Arrastar um canto move o canto.
 * - Arrastar uma parede sozinha a move em paralelo (as vizinhas esticam).
 * - Arrastar uma porta ou janela a desliza pela parede (ou a leva para outra parede).
 * - Arrastar um texto, uma cota ou qualquer objeto de uma seleção múltipla move tudo junto.
 * - Duplo clique: na parede insere um nó; no texto edita; dentro de um cômodo edita o nome.
 */
export function createSelectTool(): Tool {
  let mode: Mode = 'idle'
  let moved = false
  let pressWorld: Point = { x: 0, y: 0 }
  let pressScreen: Point = { x: 0, y: 0 }
  let orig: Project | null = null
  let nodeId: Id | null = null
  let wallId: Id | null = null
  let openingId: Id | null = null
  /** Distância, ao longo da parede, entre o ponto agarrado e o centro da abertura. */
  let grab = 0
  /** Objetos arrastados juntos e o deslocamento já aplicado a eles. */
  let moveIds: Id[] = []
  let applied: Point = { x: 0, y: 0 }

  const draggingDoc = () => moved && (mode === 'node' || mode === 'wall' || mode === 'opening' || mode === 'move')

  function end() {
    mode = 'idle'
    moved = false
    orig = null
    nodeId = null
    wallId = null
    openingId = null
    moveIds = []
    applied = { x: 0, y: 0 }
    ui().set({ box: null, snap: null })
  }

  function toggle(id: Id) {
    const sel = editor().selection
    editor().setSelection(sel.includes(id) ? sel.filter((s) => s !== id) : [...sel, id])
  }

  function dragNode(e: PointerInfo) {
    const p = orig!
    const id = nodeId!
    const walls = wallsAtNode(p, id)
    // Com uma só parede ligada ao canto, o ângulo é travado em relação à outra ponta.
    const from = walls.length === 1 ? nodePos(p, otherNode(walls[0]!, id)) : undefined
    const s = snapPoint(p, e.world, { pxPerCm: pxPerCm(), from, shift: e.shift, alt: e.alt, excludeNodes: [id] })
    docStore().update('Canto movido', (d) => setNodePositions(d, { [id]: s.point }))
    ui().set({ snap: s })
  }

  function dragWall(e: PointerInfo) {
    const p = orig!
    const w = p.walls[wallId!]!
    const n = perp(normalize(sub(nodePos(p, w.b), nodePos(p, w.a))))
    const raw = dot(sub(e.world, pressWorld), n)
    const positions = parallelMovePositions(p, w.id, e.alt ? raw : Math.round(raw))
    docStore().update('Parede movida', (doc) => setNodePositions(doc, positions))
  }

  function dragMove(e: PointerInfo) {
    const step = e.alt ? 0.01 : 1
    const total = { x: Math.round((e.world.x - pressWorld.x) / step) * step, y: Math.round((e.world.y - pressWorld.y) / step) * step }
    const delta = { x: total.x - applied.x, y: total.y - applied.y }
    if (delta.x === 0 && delta.y === 0) return
    applied = total
    const ids = moveIds
    docStore().update('Seleção movida', (d) => shiftSelection(d, ids, delta))
  }

  function dragOpening(e: PointerInfo) {
    const p = project()
    const o = p.openings[openingId!]
    if (!o) return
    const k = pxPerCm()
    // Fica na própria parede enquanto o cursor estiver perto dela; senão, pula para a parede sob o cursor.
    const own = p.walls[o.wallId]!
    const [oa, ob] = wallEnds(p, own)
    const ownDist = Math.abs(dot(sub(e.world, oa), perp(normalize(sub(ob, oa)))))
    const near = nearestWall(p, e.world, k)
    const target = near && near.wallId !== o.wallId && ownDist > own.thickness / 2 + 30 / k ? p.walls[near.wallId]! : own
    const [a, b] = wallEnds(p, target)
    const along = dot(sub(e.world, a), normalize(sub(b, a)))
    const raw = target.id === o.wallId ? along - grab : along
    const offset = snapOffset(p, target.id, Math.max(0, Math.min(wallLength(p, target), raw)), o.width, k, e.alt)
    if (offset === null) return
    const id = o.id
    // Se a posição estiver ocupada, a abertura simplesmente fica na última posição válida.
    docStore().update('Abertura movida', (d) => void moveOpening(d, id, target.id, offset))
  }

  return {
    cursor() {
      if (draggingDoc() && mode !== 'node') return 'grabbing'
      const h = ui().hover
      if (h?.kind === 'node') return 'move'
      if (h) return 'pointer'
      return 'default'
    },

    onPointerDown(e) {
      if (e.button !== 0) return
      const p = project()
      const hit = hitTest(p, e.world, pxPerCm())
      pressWorld = e.world
      pressScreen = e.screen
      moved = false
      orig = p

      if (!hit) {
        mode = 'box'
        return
      }
      if (hit.kind === 'node') {
        mode = 'node'
        nodeId = hit.id
        return
      }
      if (e.shift) {
        toggle(hit.id)
        mode = 'none'
        return
      }
      if (!editor().selection.includes(hit.id)) editor().setSelection([hit.id])
      const selected = editor().selection.filter((id) => !isLocked(p, id))
      const c = classify(p, selected)

      // Vários objetos selecionados (ou um texto/cota): arrastar move tudo junto.
      if (c.count > 1 || hit.kind === 'text' || hit.kind === 'dimension') {
        // Aberturas andam com as suas paredes; sozinhas, não entram no arraste em grupo.
        moveIds = [...c.walls, ...c.texts, ...c.dimensions].map((o) => o.id)
        mode = moveIds.length > 0 ? 'move' : 'none'
        return
      }
      if (hit.kind === 'opening') {
        mode = 'opening'
        openingId = hit.id
        const o = p.openings[hit.id]!
        const [a, b] = wallEnds(p, p.walls[o.wallId]!)
        grab = dot(sub(e.world, openingCenter(p, o)), normalize(sub(b, a)))
        return
      }
      mode = 'wall'
      wallId = hit.id
    },

    onPointerMove(e) {
      ui().set({ cursor: e.world })
      if (mode === 'idle') {
        ui().set({ hover: hitTest(project(), e.world, pxPerCm()) })
        return
      }
      if (mode === 'none') return
      if (!moved) {
        if (dist(e.screen, pressScreen) < DRAG_PX) return
        moved = true
        if (mode === 'node') docStore().begin('Canto movido')
        if (mode === 'wall') docStore().begin('Parede movida')
        if (mode === 'opening') docStore().begin('Abertura movida')
        if (mode === 'move') docStore().begin(moveIds.length > 1 ? 'Seleção movida' : 'Objeto movido')
      }
      if (mode === 'node') dragNode(e)
      else if (mode === 'wall') dragWall(e)
      else if (mode === 'opening') dragOpening(e)
      else if (mode === 'move') dragMove(e)
      else if (mode === 'box') ui().set({ box: { a: pressWorld, b: e.world } })
    },

    onPointerUp(e) {
      if (mode === 'node') {
        if (moved) {
          const id = nodeId!
          docStore().update('Canto movido', (d) => {
            connectMovedNodes(d, [id])
            fitOpeningsToWalls(d)
          })
          docStore().commit()
        } else {
          // Clique num canto sem arrastar: seleciona a parede sob ele, se houver.
          const w = hitWall(project(), e.world, pxPerCm())
          if (e.shift && w) toggle(w)
          else editor().setSelection(w ? [w] : [])
        }
      } else if (mode === 'wall') {
        if (moved) {
          const id = wallId!
          docStore().update('Parede movida', (d) => settleSelection(d, [id]))
          docStore().commit()
        }
      } else if (mode === 'move') {
        if (moved) {
          const ids = moveIds
          docStore().update('Seleção movida', (d) => settleSelection(d, ids))
          docStore().commit()
        }
      } else if (mode === 'opening') {
        if (moved) docStore().commit()
      } else if (mode === 'box') {
        if (moved) {
          const ids = objectsInBox(project(), pressWorld, e.world, e.world.x < pressWorld.x)
          editor().setSelection(e.shift ? [...new Set([...editor().selection, ...ids])] : ids)
        } else if (!e.shift) {
          editor().setSelection([])
        }
      }
      end()
    },

    onDoubleClick(e) {
      const p = project()
      const hit = hitTest(p, e.world, pxPerCm(), { nodes: false })
      if (hit?.kind === 'text') {
        const t = p.texts[hit.id]!
        editor().setTextEdit({ id: t.id, at: { x: t.x, y: t.y }, initial: t.text })
        return
      }
      if (hit?.kind === 'opening' || hit?.kind === 'dimension') return
      if (hit?.kind === 'wall') {
        const id = hit.id
        const w = p.walls[id]!
        const a = nodePos(p, w.a)
        const b = nodePos(p, w.b)
        const dir = normalize(sub(b, a))
        const t = Math.round(dot(sub(e.world, a), dir))
        if (t <= 1 || t >= dist(a, b) - 1) return
        docStore().update('Nó inserido', (d) => {
          splitWall(d, id, { x: a.x + dir.x * t, y: a.y + dir.y * t })
        })
        return
      }
      // Duplo clique dentro de um cômodo: editar o nome.
      const room = roomAt(p, e.world)
      if (room) editor().setRenamingRoom(room.key)
    },

    onKeyDown(e) {
      if (e.key === 'Escape' && mode !== 'idle') {
        if (draggingDoc()) docStore().cancel()
        end()
        return true
      }
      return false
    },

    onDeactivate() {
      if (draggingDoc()) docStore().commit()
      end()
      ui().set({ hover: null })
    },
  }
}
