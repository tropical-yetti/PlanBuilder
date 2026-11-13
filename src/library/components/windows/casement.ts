import type { ComponentDef } from '../../types'
import { frame, WINDOW_LIMITS } from './shared'

export const windowCasement: ComponentDef = {
  id: 'window.casement',
  category: 'windows',
  kind: 'opening',
  name: 'Janela de abrir',
  tags: ['janela', 'abrir', 'giro', 'duas folhas', 'veneziana'],
  defaults: { width: 100, height: 120, sillHeight: 100, params: {} },
  presets: [80, 100, 120, 150],
  limits: WINDOW_LIMITS,
  sided: true,
  hinged: false,
  hasSill: true,
  symbol({ width: w, thickness: t }) {
    const h = w / 2
    const y = t / 2
    return [
      frame(w, t),
      { t: 'line', pts: [-h, 0, h, 0] },
      // giro das duas folhas
      { t: 'line', pts: [-h, y, -h, y + h], thin: true },
      { t: 'arc', cx: -h, cy: y, r: h, a0: Math.PI / 2, a1: 0, dash: true, thin: true },
      { t: 'line', pts: [h, y, h, y + h], thin: true },
      { t: 'arc', cx: h, cy: y, r: h, a0: Math.PI / 2, a1: Math.PI, dash: true, thin: true },
    ]
  },
}
