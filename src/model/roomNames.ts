import { newId } from './project'
import { pointInMulti, type Room } from './quantities'
import type { Project } from './types'

/** Nomes sugeridos ao renomear um cômodo. */
export const ROOM_NAME_SUGGESTIONS = [
  'Sala',
  'Sala de jantar',
  'Cozinha',
  'Quarto',
  'Suíte',
  'Banheiro',
  'Lavabo',
  'Área de serviço',
  'Varanda',
  'Escritório',
  'Corredor',
  'Garagem',
  'Closet',
  'Despensa',
]

/**
 * Dá nome ao cômodo. O nome fica preso a um ponto dentro dele (`roomLabels`), não às paredes:
 * assim ele sobrevive a mudanças no contorno. Nome vazio volta ao automático ("Cômodo N").
 */
export function renameRoom(p: Project, room: Room, name: string): void {
  for (const l of Object.values(p.roomLabels)) {
    if (pointInMulti(l, room.shape)) delete p.roomLabels[l.id]
  }
  const clean = name.trim()
  if (clean === '') return
  const id = newId()
  p.roomLabels[id] = { id, x: Math.round(room.labelPoint.x * 100) / 100, y: Math.round(room.labelPoint.y * 100) / 100, name: clean }
}
