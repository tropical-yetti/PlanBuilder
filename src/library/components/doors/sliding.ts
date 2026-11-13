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
}
