import type { ComponentDef } from '../../types'

export const doorSwingDouble: ComponentDef = {
  id: 'door.swing-double',
  category: 'doors',
  kind: 'opening',
  name: 'Porta de giro dupla',
  tags: ['porta', 'dupla', 'duas folhas', 'abrir', 'giro', 'entrada'],
  defaults: { width: 140, height: 210, sillHeight: 0, params: {} },
  presets: [120, 140, 160, 180],
  limits: { minWidth: 100, maxWidth: 240, minHeight: 180, maxHeight: 300 },
  sided: true,
  hinged: false,
  hasSill: false,
  symbol({ width: w, thickness: t }) {
    const h = w / 2
    const y = t / 2
    return [
      { t: 'rect', x: -h, y, w: 4, h, fill: 'leaf' },
      { t: 'arc', cx: -h, cy: y, r: h, a0: Math.PI / 2, a1: 0, thin: true },
      { t: 'rect', x: h - 4, y, w: 4, h, fill: 'leaf' },
      { t: 'arc', cx: h, cy: y, r: h, a0: Math.PI / 2, a1: Math.PI, thin: true },
    ]
  },
}
