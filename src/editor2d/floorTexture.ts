/**
 * Desenho do ladrilho de piso num canvas, compartilhado pela planta (padrão repetido do canvas 2D),
 * pela exportação e pela textura da vista 3D.
 */
import { getFloor, MATERIAL_VARIATION } from '../library/floors'
import { floorTile, jointColor, shadeColor, type FloorTile } from '../model/floorPattern'
import type { RoomFloor } from '../model/types'

export interface FloorTexture {
  canvas: HTMLCanvasElement
  tile: FloorTile
  /** Pixels do canvas por cm. */
  res: number
}

/** Lado máximo do canvas do ladrilho, em pixels. */
const MAX_PX = 1024
const cache = new Map<string, FloorTexture | null>()

export const floorKey = (f: Omit<RoomFloor, 'id' | 'x' | 'y'>): string =>
  [f.componentId, f.pattern, f.width, f.length, f.joint, f.color, f.rotation].join('|')

/** Canvas com um ladrilho do piso (guardado: pisos iguais usam o mesmo). Null se não houver canvas (testes). */
export function floorTexture(f: Omit<RoomFloor, 'id' | 'x' | 'y'>): FloorTexture | null {
  const key = floorKey(f)
  const hit = cache.get(key)
  if (hit !== undefined) return hit
  const tile = floorTile(f)
  const res = Math.min(8, MAX_PX / Math.max(tile.w, tile.h))
  const canvas = typeof document !== 'undefined' ? document.createElement('canvas') : null
  const ctx = canvas?.getContext('2d')
  if (!canvas || !ctx) {
    cache.set(key, null)
    return null
  }
  canvas.width = Math.max(1, Math.round(tile.w * res))
  canvas.height = Math.max(1, Math.round(tile.h * res))
  // O canvas tem tamanho inteiro: a escala corrige o arredondamento para o ladrilho emendar sem frestas.
  ctx.scale(canvas.width / tile.w, canvas.height / tile.h)
  ctx.fillStyle = f.joint > 0 ? jointColor(f.color) : shadeColor(f.color, -0.35)
  ctx.fillRect(0, 0, tile.w, tile.h)
  const variation = MATERIAL_VARIATION[getFloor(f.componentId).material]
  // Sem junta, as peças são separadas por um fio (meio pixel do ladrilho).
  const gap = f.joint > 0 ? 0 : 0.6 / res
  for (const r of tile.pieces) {
    ctx.fillStyle = shadeColor(f.color, r.shade * variation)
    ctx.fillRect(r.x + gap / 2, r.y + gap / 2, r.w - gap, r.h - gap)
  }
  const out = { canvas, tile, res }
  cache.set(key, out)
  return out
}
