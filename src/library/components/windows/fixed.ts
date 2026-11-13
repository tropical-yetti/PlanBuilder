import type { ComponentDef } from '../../types'
import { frame, WINDOW_LIMITS } from './shared'

export const windowFixed: ComponentDef = {
  id: 'window.fixed',
  category: 'windows',
  kind: 'opening',
  name: 'Janela fixa',
  tags: ['janela', 'fixa', 'vidro fixo', 'vitrine'],
  defaults: { width: 100, height: 100, sillHeight: 100, params: {} },
  presets: [60, 100, 150, 200],
  limits: WINDOW_LIMITS,
  sided: false,
  hinged: false,
  hasSill: true,
  symbol({ width: w, thickness: t }) {
    return [frame(w, t), { t: 'line', pts: [-w / 2, 0, w / 2, 0] }]
  },
}
