import type { ComponentDef, Prim } from '../../types'
import { frame, WINDOW_LIMITS } from './shared'

export const windowSliding: ComponentDef = {
  id: 'window.sliding',
  category: 'windows',
  kind: 'opening',
  name: 'Janela de correr',
  tags: ['janela', 'correr', 'deslizante', 'folhas', 'vidro'],
  defaults: { width: 120, height: 120, sillHeight: 100, params: { leaves: 2 } },
  presets: [100, 120, 150, 200],
  limits: WINDOW_LIMITS,
  sided: false,
  hinged: false,
  hasSill: true,
  paramsSchema: [
    {
      key: 'leaves',
      label: 'Folhas',
      type: 'select',
      options: [
        { value: 2, label: '2 folhas' },
        { value: 3, label: '3 folhas' },
        { value: 4, label: '4 folhas' },
      ],
    },
  ],
  symbol({ width: w, thickness: t, params }) {
    const n = Math.min(4, Math.max(2, Number(params.leaves) || 2))
    const prims: Prim[] = [frame(w, t)]
    const leaf = w / n
    const overlap = Math.min(4, leaf * 0.1)
    const d = Math.min(2, t / 6)
    // folhas alternadas em dois trilhos, com um pequeno transpasse
    for (let i = 0; i < n; i++) {
      const x0 = -w / 2 + i * leaf - (i > 0 ? overlap : 0)
      const x1 = -w / 2 + (i + 1) * leaf + (i < n - 1 ? overlap : 0)
      const y = i % 2 === 0 ? -d : d
      prims.push({ t: 'line', pts: [x0, y, x1, y] })
    }
    return prims
  },
}
