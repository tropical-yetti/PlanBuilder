import type { WallKind } from '../model/types'
import { WALL_KINDS } from './wallKinds'

/** Seletor do tipo de parede (botões lado a lado). `value` null = seleção com tipos diferentes. */
export function WallKindPicker({ value, onChange, label = 'Tipo de parede' }: { value: WallKind | null; onChange: (kind: WallKind) => void; label?: string }) {
  return (
    <div className="segmented small" role="radiogroup" aria-label={label}>
      {WALL_KINDS.map((k) => (
        <button key={k.id} type="button" role="radio" aria-checked={value === k.id} className={value === k.id ? 'active' : ''} title={k.title} onClick={() => onChange(k.id)}>
          {k.label}
        </button>
      ))}
    </div>
  )
}
