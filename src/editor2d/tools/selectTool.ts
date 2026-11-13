import { dist, dot, normalize, perp, sub } from '../../model/geometry'
import { connectMovedNodes, nodePos, nodesOfWalls, otherNode, parallelMovePositions, setNodePositions, splitWall, wallsAtNode } from '../../model/walls'
import type { Id, Point, Project } from '../../model/types'
import { hitTest, hitWall, wallsInBox } from '../hitTest'
import { snapPoint } from '../snapping'
import { docStore, editor, project, pxPerCm, ui } from './context'
import type { PointerInfo, Tool } from './types'

type Mode = 'idle' | 'node' | 'wall' | 'box' | 'none'

/** Distância mínima (px) para um clique virar arraste. */
const DRAG_PX = 4

/**
 * Selecionar: clique seleciona; Shift+clique adiciona/remove; arrastar no vazio faz caixa de seleção.
 * Arrastar um canto move o canto; arrastar uma parede a move em paralelo (as vizinhas esticam);
 * com várias paredes selecionadas, arrastar move todas juntas. Duplo clique na parede insere um nó.
 */
export function createSelectTool(): Tool {
  let mode: Mode = 'idle'
  let moved = false
  let pressWorld: Point = { x: 0, y: 0 }
  let pressScreen: Point = { x: 0, y: 0 }
  let orig: Project | null = null
  let nodeId: Id | null = null
  let wallId: Id | null = null
  let dragWalls: Id[] = []

  function end() {
    mode = 'idle'
    moved = false
    orig = null
    nodeId = null
    wallId = null
    dragWalls = []
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
    const delta = sub(e.world, pressWorld)
    if (dragWalls.length <= 1) {
      const w = p.walls[wallId!]!
      const n = perp(normalize(sub(nodePos(p, w.b), nodePos(p, w.a))))
      const raw = dot(delta, n)
      const d = e.alt ? raw : Math.round(raw)
      const positions = parallelMovePositions(p, w.id, d)
      docStore().update('Parede movida', (doc) => setNodePositions(doc, positions))
    } else {
      const grid = e.alt ? 0.01 : 1
      const dx = Math.round(delta.x / grid) * grid
      const dy = Math.round(delta.y / grid) * grid
      const positions: Record<Id, Point> = {}
      for (const id of nodesOfWalls(p, dragWalls)) {
        const n = p.nodes[id]!
        positions[id] = { x: n.x + dx, y: n.y + dy }
      }
      docStore().update('Paredes movidas', (doc) => setNodePositions(doc, positions))
    }
  }

  return {
    cursor() {
      if (mode === 'wall' && moved) return 'grabbing'
      const h = ui().hover
      if (h?.kind === 'node') return 'move'
      if (h?.kind === 'wall') return 'pointer'
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

      if (hit?.kind === 'node') {
        mode = 'node'
        nodeId = hit.id
        return
      }
      if (hit?.kind === 'wall') {
        if (e.shift) {
          toggle(hit.id)
          mode = 'none'
          return
        }
        if (!editor().selection.includes(hit.id)) editor().setSelection([hit.id])
        mode = 'wall'
        wallId = hit.id
        dragWalls = editor().selection.filter((id) => !!p.walls[id])
        return
      }
      mode = 'box'
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
        if (mode === 'wall') docStore().begin(dragWalls.length > 1 ? 'Paredes movidas' : 'Parede movida')
      }
      if (mode === 'node') dragNode(e)
      else if (mode === 'wall') dragWall(e)
      else if (mode === 'box') ui().set({ box: { a: pressWorld, b: e.world } })
    },

    onPointerUp(e) {
      if (mode === 'node') {
        if (moved) {
          const id = nodeId!
          docStore().update('Canto movido', (d) => connectMovedNodes(d, [id]))
          docStore().commit()
        } else {
          // Clique num canto sem arrastar: seleciona a parede sob ele, se houver.
          const w = hitWall(project(), e.world, pxPerCm())
          if (e.shift && w) toggle(w)
          else editor().setSelection(w ? [w] : [])
        }
      } else if (mode === 'wall') {
        if (moved) {
          const ids = dragWalls.length > 1 ? dragWalls : [wallId!]
          docStore().update('Parede movida', (d) => connectMovedNodes(d, nodesOfWalls(d, ids)))
          docStore().commit()
        }
      } else if (mode === 'box') {
        if (moved) {
          const ids = wallsInBox(project(), pressWorld, e.world, e.world.x < pressWorld.x)
          const sel = e.shift ? [...new Set([...editor().selection, ...ids])] : ids
          editor().setSelection(sel)
        } else if (!e.shift) {
          editor().setSelection([])
        }
      }
      end()
    },

    onDoubleClick(e) {
      const p = project()
      const id = hitWall(p, e.world, pxPerCm())
      if (!id) return
      const w = p.walls[id]!
      const a = nodePos(p, w.a)
      const b = nodePos(p, w.b)
      const dir = normalize(sub(b, a))
      const t = Math.round(dot(sub(e.world, a), dir))
      if (t <= 1 || t >= dist(a, b) - 1) return
      docStore().update('Nó inserido', (d) => {
        splitWall(d, id, { x: a.x + dir.x * t, y: a.y + dir.y * t })
      })
    },

    onKeyDown(e) {
      if (e.key === 'Escape' && mode !== 'idle') {
        if (moved && (mode === 'node' || mode === 'wall')) docStore().cancel()
        end()
        return true
      }
      return false
    },

    onDeactivate() {
      if (moved && (mode === 'node' || mode === 'wall')) docStore().commit()
      end()
      ui().set({ hover: null })
    },
  }
}
