import type { ComponentDef } from '../../types'

export const doorOpenPassage: ComponentDef = {
  id: 'door.open-passage',
  category: 'doors',
  kind: 'opening',
  name: 'Vão livre',
  tags: ['vão', 'passagem', 'abertura', 'sem porta', 'arco'],
  defaults: { width: 80, height: 210, sillHeight: 0, params: {} },
  presets: [70, 80, 90, 120],
  limits: { minWidth: 40, maxWidth: 500, minHeight: 100, maxHeight: 300 },
  sided: false,
  hinged: false,
  hasSill: false,
  symbol({ width: w, thickness: t }) {
    // só as linhas tracejadas das faces da parede, indicando a passagem
    return [
      { t: 'line', pts: [-w / 2, -t / 2, w / 2, -t / 2], dash: true, thin: true },
      { t: 'line', pts: [-w / 2, t / 2, w / 2, t / 2], dash: true, thin: true },
    ]
  },
}
