import type { ComponentDef } from '../../types'
import { frame, WINDOW_LIMITS } from './shared'

export const windowTilt: ComponentDef = {
  id: 'window.tilt',
  category: 'windows',
  kind: 'opening',
  name: 'Basculante',
  tags: ['janela', 'basculante', 'banheiro', 'maxim-ar', 'ventilação'],
  defaults: { width: 60, height: 60, sillHeight: 160, params: {} },
  presets: [40, 60, 80, 100],
  limits: WINDOW_LIMITS,
  sided: true,
  hinged: false,
  hasSill: true,
  symbol({ width: w, thickness: t }) {
    const y = t / 2
    const out = Math.min(12, w / 4)
    return [
      frame(w, t),
      { t: 'line', pts: [-w / 2, 0, w / 2, 0] },
      // projeção da folha basculando para fora
      { t: 'line', pts: [-w / 2, y, -w / 2, y + out, w / 2, y + out, w / 2, y], dash: true, thin: true },
    ]
  },
}
