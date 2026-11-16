import type { WallKind } from '../model/types'

/** Tipos de parede, na ordem em que aparecem nos seletores. */
export const WALL_KINDS: { id: WallKind; label: string; title: string }[] = [
  { id: 'masonry', label: 'Alvenaria', title: 'Parede comum (tijolo, bloco): divide cômodos' },
  { id: 'partition', label: 'Divisória', title: 'Drywall do piso ao teto: divide cômodos, com quantitativo próprio' },
  { id: 'panel', label: 'Painel', title: 'Parede falsa de gesso, painel de TV, meia-parede: não forma cômodo, só desconta a área que ocupa' },
]
