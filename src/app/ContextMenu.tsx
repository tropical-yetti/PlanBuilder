import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { commands } from '../commands/registry'
import { formatShortcut, isMacPlatform } from '../commands/shortcuts'
import { isLocked } from '../model/selection'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

const isMac = isMacPlatform()
const SEP = '-'

/** Ações oferecidas conforme o que está sob o cursor. Só aparecem as que estão disponíveis. */
const OBJECT_ITEMS = [
  'wall.splitHere',
  'wall.merge',
  'opening.flipSide',
  'opening.flipHinge',
  'opening.center',
  'opening.distribute',
  SEP,
  'edit.cut',
  'edit.copy',
  'edit.duplicate',
  'edit.copyStyle',
  'edit.pasteStyle',
  SEP,
  'edit.rotateCw',
  'edit.rotateCcw',
  'edit.mirrorH',
  'edit.mirrorV',
  'edit.scale',
  SEP,
  'align.left',
  'align.centerX',
  'align.right',
  'align.top',
  'align.centerY',
  'align.bottom',
  'distribute.x',
  'distribute.y',
  SEP,
  'select.similar',
  'edit.lock',
  SEP,
  'edit.delete',
]
const LOCKED_ITEMS = ['edit.unlock', 'edit.unlockAll']
const EMPTY_ITEMS = ['room.rename', 'room.selectWalls', SEP, 'edit.pasteHere', 'edit.selectAll', 'edit.unlockAll', SEP, 'view.fit', 'app.palette']

export function ContextMenu() {
  const target = useEditorStore((s) => s.contextMenu)
  const close = () => useEditorStore.getState().setContextMenu(null)
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })

  // Mantém o menu dentro da janela.
  useLayoutEffect(() => {
    if (!target || !ref.current) return
    const r = ref.current.getBoundingClientRect()
    setPos({
      x: Math.max(4, Math.min(target.page.x, window.innerWidth - r.width - 4)),
      y: Math.max(4, Math.min(target.page.y, window.innerHeight - r.height - 4)),
    })
  }, [target])

  useEffect(() => {
    if (!target) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        close()
      }
    }
    window.addEventListener('pointerdown', onDown, { capture: true })
    window.addEventListener('keydown', onKey, { capture: true })
    window.addEventListener('wheel', close, { passive: true })
    window.addEventListener('blur', close)
    return () => {
      window.removeEventListener('pointerdown', onDown, { capture: true })
      window.removeEventListener('keydown', onKey, { capture: true })
      window.removeEventListener('wheel', close)
      window.removeEventListener('blur', close)
    }
  }, [target])

  if (!target) return null

  const project = useProjectStore.getState().project
  const source = target.id ? (isLocked(project, target.id) ? LOCKED_ITEMS : OBJECT_ITEMS) : EMPTY_ITEMS
  // Só as ações disponíveis; separadores repetidos ou nas pontas somem.
  const items: string[] = []
  for (const id of source) {
    if (id === SEP) {
      if (items.length > 0 && items.at(-1) !== SEP) items.push(SEP)
    } else if (commands.isEnabled(id)) {
      items.push(id)
    }
  }
  while (items.at(-1) === SEP) items.pop()
  if (items.length === 0) return null

  return (
    <div ref={ref} className="context-menu" role="menu" style={{ left: pos.x, top: pos.y }} onContextMenu={(e) => e.preventDefault()}>
      {items.map((id, i) => {
        if (id === SEP) return <div key={`sep-${i}`} className="menu-sep" role="separator" />
        const cmd = commands.get(id)!
        const shortcut = cmd.shortcuts[0] ?? cmd.hint
        return (
          <button
            key={id}
            type="button"
            role="menuitem"
            className={`menu-item ${id === 'edit.delete' ? 'danger' : ''}`}
            onClick={() => {
              commands.execute(id)
              close()
            }}
          >
            <span>{cmd.label}</span>
            {shortcut && <kbd>{formatShortcut(shortcut, isMac)}</kbd>}
          </button>
        )
      })}
    </div>
  )
}
