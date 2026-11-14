import { FRAME, frameBoxes } from '../../model3d'
import type { ComponentDef } from '../../types'

export const doorSliding: ComponentDef = {
  id: 'door.sliding',
  category: 'doors',
  kind: 'opening',
  name: 'Porta de correr',
  tags: ['porta', 'correr', 'deslizante', 'trilho'],
  defaults: { width: 90, height: 210, sillHeight: 0, params: {} },
  presets: [70, 80, 90, 100],
  limits: { minWidth: 60, maxWidth: 200, minHeight: 180, maxHeight: 300 },
  sided: true,
  hinged: true,
  hasSill: false,
  symbol({ width: w, thickness: t }) {
    const y = t / 2 + 2
    return [
      // folha meio aberta, correndo por fora da parede, e o trilho por onde ela desliza
      { t: 'line', pts: [-w / 2, y + 2, w * 1.1, y + 2], dash: true, thin: true },
      { t: 'rect', x: 0, y, w, h: 4, fill: 'leaf' },
    ]
  },
  model({ width: w, height: h, thickness: t }) {
    // folha meio aberta, correndo por fora da parede, com o trilho acima
    return [
      ...frameBoxes(w, h, t),
      { x: w / 2, y: (h - FRAME) / 2, z: t / 2 + 3, w, h: h - FRAME, d: 4, mat: 'leaf' },
      { x: w / 4, y: h + 2, z: t / 2 + 3, w: w * 1.5, h: 4, d: 5, mat: 'frame' },
    ]
  },
}
