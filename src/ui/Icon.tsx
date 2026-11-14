import type { ToolId } from '../store/editorStore'

type IconName = ToolId | 'undo' | 'redo'

const PATHS: Record<IconName, string> = {
  select: 'M5 3l14 8-6 2-3 6z',
  wall: 'M3 17h18M3 13h18M7 13v4M13 13v4M19 13v4',
  room: 'M4 4h16v16H4z M4 9h16',
  erase: 'M4 15l7-7 6 6-4 4H8z M13 19h7',
  measure: 'M3 15l12-12 6 6-12 12z M7 11l2 2 M10 8l2 2 M13 5l2 2',
  dimension: 'M4 6v12 M20 6v12 M4 12h16 M7 9l-3 3 3 3 M17 9l3 3-3 3',
  text: 'M5 5h14 M12 5v14 M9 19h6',
  place: 'M12 5v14 M5 12h14',
  undo: 'M9 14L4 9l5-5 M4 9h10a6 6 0 0 1 0 12h-3',
  redo: 'M15 14l5-5-5-5 M20 9H10a6 6 0 0 0 0 12h3',
}

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
