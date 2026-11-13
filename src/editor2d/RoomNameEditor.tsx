import { useState } from 'react'
import { ROOM_NAME_SUGGESTIONS, renameRoom } from '../model/roomNames'
import type { Room } from '../model/quantities'
import { useEditorStore, worldToScreen } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

/** Campo de texto sobre a planta para dar nome ao cômodo (duplo clique dentro dele). */
export function RoomNameEditor({ room }: { room: Room }) {
  const view = useEditorStore((s) => s.view)
  const close = () => useEditorStore.getState().setRenamingRoom(null)
  const [text, setText] = useState(room.named ? room.name : '')
  const at = worldToScreen(view, room.labelPoint)

  function commit() {
    const current = room.named ? room.name : ''
    if (text.trim() !== current) {
      useProjectStore.getState().update('Cômodo renomeado', (d) => renameRoom(d, room, text))
    }
    close()
  }

  return (
    <>
      <input
        className="room-name-input"
        style={{ left: at.x, top: at.y }}
        autoFocus
        value={text}
        placeholder={room.name}
        list="room-name-suggestions"
        aria-label="Nome do cômodo"
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          else if (e.key === 'Escape') close()
        }}
      />
      <datalist id="room-name-suggestions">
        {ROOM_NAME_SUGGESTIONS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </>
  )
}
