import type { OpeningDef } from '../../types'
import { COBOGO_BASE } from './shared'

/** Painel de cobogó do piso ao teto: ocupa um trecho (ou a parede inteira) com elementos vazados. */
export const cobogoPanel: OpeningDef = {
  ...COBOGO_BASE,
  id: 'cobogo.panel',
  name: 'Parede de cobogó',
  tags: ['cobogó', 'cobogo', 'elemento vazado', 'vazado', 'parede', 'divisória', 'painel', 'ventilação'],
  defaults: { width: 150, height: 280, sillHeight: 0, params: { pieceSize: 25 } },
  presets: [100, 150, 200, 300],
  fullHeight: true,
}
