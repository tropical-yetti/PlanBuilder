import type { OpeningDef } from '../../types'
import { COBOGO_BASE } from './shared'

/** Faixa de cobogó no alto da parede, para ventilação e luz (comum em cozinhas e áreas de serviço). */
export const cobogoBand: OpeningDef = {
  ...COBOGO_BASE,
  id: 'cobogo.band',
  name: 'Faixa de cobogó',
  tags: ['cobogó', 'cobogo', 'elemento vazado', 'vazado', 'ventilação', 'faixa', 'área de serviço', 'cozinha'],
  defaults: { width: 150, height: 50, sillHeight: 200, params: { pieceSize: 25 } },
  presets: [100, 150, 200, 300],
}
