import { create } from 'zustand'
import type { Id, Point } from '../model/types'
import type { SnapResult } from './snapping'

export type Draft =
  | { kind: 'wall'; a: Point; b: Point }
  | { kind: 'room'; a: Point; b: Point }

export type HoverTarget = { kind: 'wall'; id: Id } | { kind: 'node'; id: Id }

/**
 * Estado passageiro da interação no canvas (cursor, prévia, caixa de seleção).
 * Não é salvo e não entra no histórico.
 */
export interface InteractionState {
  /** Posição do cursor no mundo (cm). */
  cursor: Point | null
  snap: SnapResult | null
  draft: Draft | null
  /** Medida digitada durante o desenho (ex.: "350" ou "400x300"). */
  typed: string
  /** Caixa de seleção em coordenadas do mundo. */
  box: { a: Point; b: Point } | null
  hover: HoverTarget | null
  set: (partial: Partial<Omit<InteractionState, 'set' | 'reset'>>) => void
  reset: () => void
}

export const useInteractionStore = create<InteractionState>()((set) => ({
  cursor: null,
  snap: null,
  draft: null,
  typed: '',
  box: null,
  hover: null,
  set: (partial) => set(partial),
  reset: () => set({ snap: null, draft: null, typed: '', box: null, hover: null }),
}))
