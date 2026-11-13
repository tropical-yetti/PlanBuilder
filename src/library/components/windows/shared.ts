import type { Prim } from '../../types'

/** Caixilho: retângulo ocupando o vão em toda a espessura da parede. */
export const frame = (w: number, t: number): Prim => ({ t: 'rect', x: -w / 2, y: -t / 2, w, h: t, fill: 'glass' })

export const WINDOW_LIMITS = { minWidth: 30, maxWidth: 400, minHeight: 30, maxHeight: 260 }
