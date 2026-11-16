/**
 * Pisos dos cômodos (docs/PLANO.md, seção 11.1). Como o nome, o piso fica preso a um ponto dentro
 * do cômodo (`floors`), não às paredes: sobrevive a mudanças no contorno.
 */
import { getFloor, type FloorDef } from '../library/floors'
import { newId } from './project'
import { pointInMulti, type Room } from './quantities'
import type { Project, RoomFloor } from './types'

/** Tudo do piso menos a posição: o que o painel edita. */
export type FloorSpec = Omit<RoomFloor, 'id' | 'x' | 'y'>

/** Piso padrão de uma definição da biblioteca. */
export function specFromDef(def: FloorDef): FloorSpec {
  return { componentId: def.id, ...def.defaults, rotation: 0 }
}

const round2 = (v: number) => Math.round(v * 100) / 100

/** Aplica um piso ao cômodo (null remove). Pisos anteriores dentro dele são substituídos. */
export function setRoomFloor(p: Project, room: Room, spec: FloorSpec | null): void {
  for (const f of Object.values(p.floors)) {
    if (pointInMulti(f, room.shape)) delete p.floors[f.id]
  }
  if (!spec) return
  const id = newId()
  p.floors[id] = { id, x: round2(room.labelPoint.x), y: round2(room.labelPoint.y), ...spec }
}

/** Muda só alguns campos do piso do cômodo. */
export function updateRoomFloor(p: Project, room: Room, patch: Partial<FloorSpec>): void {
  const current = Object.values(p.floors).find((f) => pointInMulti(f, room.shape))
  if (!current) return
  Object.assign(current, patch)
  // Ao trocar o piso da biblioteca, a paginação precisa ser uma das que ele oferece.
  const def = getFloor(current.componentId)
  if (!def.patterns.includes(current.pattern)) current.pattern = def.defaults.pattern
}
