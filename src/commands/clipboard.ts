/**
 * Área de transferência do app. O conteúdo copiado fica na memória e também vai, como JSON,
 * para a área de transferência do sistema: assim dá para colar em outra aba ou janela do app.
 */
import { useInteractionStore } from '../editor2d/interactionStore'
import { isLocked } from '../model/selection'
import { clipBounds, copySelection, copyStyle, parseClip, pasteClip, pasteStyle, selectionBounds, type Clip, type StyleClip } from '../model/transforms'
import { deleteObjects } from '../model/selection'
import type { Id, Point } from '../model/types'
import { screenToWorld, useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

let buffer: Clip | null = null
let style: StyleClip | null = null
/** Última duplicação: repetir Ctrl+D depois de mover a cópia repete o mesmo deslocamento. */
let lastDuplicate: { key: string; sourceAnchor: Point } | null = null

const doc = () => useProjectStore.getState()
const editor = () => useEditorStore.getState()
const selection = (): Id[] => {
  const p = doc().project
  return editor().selection.filter((id) => p.walls[id] || p.openings[id] || p.items[id] || p.texts[id] || p.dimensions[id])
}
const keyOf = (ids: Id[]) => [...ids].sort().join('|')

export const hasClip = (): boolean => buffer !== null
export const hasStyle = (): boolean => style !== null
export const hasSelection = (): boolean => selection().length > 0

/** Copia a seleção. Retorna o JSON para a área de transferência do sistema (ou null se não há seleção). */
export function copy(): string | null {
  const clip = copySelection(doc().project, selection())
  if (!clip) return null
  buffer = clip
  return JSON.stringify(clip)
}

export function cut(): string | null {
  const text = copy()
  if (text === null) return null
  const ids = selection().filter((id) => !isLocked(doc().project, id))
  doc().update(ids.length === 1 ? 'Objeto recortado' : 'Objetos recortados', (d) => deleteObjects(d, ids))
  editor().setSelection([])
  return text
}

/** Ponto do mundo onde colar: sob o cursor, se ele estiver sobre a planta; senão, no centro da tela. */
function pasteTarget(): Point {
  const cursor = useInteractionStore.getState().cursor
  if (cursor) return cursor
  const { view, canvasSize } = editor()
  return screenToWorld(view, { x: canvasSize.width / 2, y: canvasSize.height / 2 })
}

function applyPaste(clip: Clip, delta: Point, label: string): Id[] {
  let created: Id[] = []
  doc().update(label, (d) => {
    created = pasteClip(d, clip, delta)
  })
  if (created.length > 0) editor().setSelection(created)
  return created
}

/**
 * Cola o conteúdo. `text` é o que veio da área de transferência do sistema (pode ser de outra aba);
 * `at` força a posição (menu de contexto); `inPlace` cola exatamente onde foi copiado.
 */
export function paste(opts: { text?: string; at?: Point; inPlace?: boolean } = {}): boolean {
  const clip = (opts.text ? parseClip(opts.text) : null) ?? buffer
  if (!clip) return false
  buffer = clip
  let delta: Point = { x: 0, y: 0 }
  if (!opts.inPlace) {
    const b = clipBounds(clip)
    if (!b) return false
    const target = opts.at ?? pasteTarget()
    // Deslocamento em centímetros inteiros, para o desenho colado manter as medidas "redondas".
    delta = { x: Math.round(target.x - (b.minX + b.maxX) / 2), y: Math.round(target.y - (b.minY + b.maxY) / 2) }
  }
  applyPaste(clip, delta, 'Colado')
  return true
}

/** Duplica a seleção com um pequeno deslocamento; repetir depois de mover a cópia repete o deslocamento. */
export function duplicate(): void {
  const p = doc().project
  const ids = selection()
  const clip = copySelection(p, ids)
  const b = selectionBounds(p, ids)
  if (!clip || !b) return
  const anchor = { x: b.minX, y: b.minY }
  let delta: Point = { x: 20, y: 20 }
  if (lastDuplicate && lastDuplicate.key === keyOf(ids)) {
    const d = { x: anchor.x - lastDuplicate.sourceAnchor.x, y: anchor.y - lastDuplicate.sourceAnchor.y }
    if (d.x !== 0 || d.y !== 0) delta = d
  }
  const created = applyPaste(clip, delta, 'Duplicado')
  lastDuplicate = created.length > 0 ? { key: keyOf(created), sourceAnchor: anchor } : null
}

export function copyProperties(): void {
  style = copyStyle(doc().project, selection()) ?? style
}

export function pasteProperties(): void {
  const s = style
  if (!s) return
  const ids = selection()
  doc().update('Propriedades coladas', (d) => pasteStyle(d, ids, s))
}


/** Para testes: esvazia a memória. */
export function resetClipboard(): void {
  buffer = null
  style = null
  lastDuplicate = null
}
