import type { ComponentDef } from '../../types'

export const doorSwingSingle: ComponentDef = {
  id: 'door.swing-single',
  category: 'doors',
  kind: 'opening',
  name: 'Porta de giro simples',
  tags: ['porta', 'abrir', 'giro', 'interna', 'entrada'],
  defaults: { width: 80, height: 210, sillHeight: 0, params: {} },
  presets: [60, 70, 80, 90],
  limits: { minWidth: 50, maxWidth: 120, minHeight: 180, maxHeight: 300 },
  sided: true,
  hinged: true,
  hasSill: false,
  symbol({ width: w, thickness: t }) {
    const hx = -w / 2
    const hy = t / 2
    return [
      // folha aberta a 90° e o arco do giro
      { t: 'rect', x: hx, y: hy, w: 4, h: w, fill: 'leaf' },
      { t: 'arc', cx: hx, cy: hy, r: w, a0: Math.PI / 2, a1: 0, thin: true },
    ]
  },
}
