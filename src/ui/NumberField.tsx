import { useState, type KeyboardEvent } from 'react'
import { parseLength, formatCmValue } from '../model/units'

interface Props {
  label: string
  /** Valor em cm; null quando a seleção tem valores diferentes. */
  value: number | null
  onCommit: (cm: number) => void
  min?: number
  max?: number
  suffix?: string
  disabled?: boolean
  title?: string
  /** Regra extra além de min/max (ex.: a porta precisa caber na parede). */
  validate?: (cm: number) => boolean
}

/**
 * Campo numérico de medida. Confirma com Enter ou ao sair do campo; Esc desfaz a digitação.
 * Setas ↑/↓ somam 1 cm (Shift: 10 cm). Aceita "350", "3,5m", "35mm".
 */
export function NumberField({ label, value, onCommit, min = 0, max = Infinity, suffix = 'cm', disabled, title, validate }: Props) {
  const shown = value === null ? '' : formatCmValue(value)
  const [text, setText] = useState(shown)
  const [invalid, setInvalid] = useState(false)
  // Quando o valor muda por fora (desfazer, outra seleção), o campo mostra o novo valor.
  const [prevShown, setPrevShown] = useState(shown)
  if (shown !== prevShown) {
    setPrevShown(shown)
    setText(shown)
    setInvalid(false)
  }

  function commit(raw: string) {
    if (raw.trim() === '' || raw === shown) {
      setText(shown)
      setInvalid(false)
      return
    }
    const v = parseLength(raw)
    if (v === null || v < min || v > max || (validate && !validate(v))) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    onCommit(v)
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      commit(text)
      e.currentTarget.select()
    } else if (e.key === 'Escape') {
      setText(shown)
      setInvalid(false)
      e.currentTarget.blur()
    } else if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && value !== null) {
      e.preventDefault()
      const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowUp' ? 1 : -1)
      const next = Math.min(max, Math.max(min, value + step))
      if (!validate || validate(next)) onCommit(next)
    }
  }

  return (
    <label className={`field ${invalid ? 'invalid' : ''}`} title={title}>
      <span className="field-label">{label}</span>
      <span className="field-input">
        <input
          type="text"
          inputMode="decimal"
          value={text}
          placeholder={value === null ? 'vários' : undefined}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={(e) => e.target.select()}
        />
        <span className="field-suffix">{suffix}</span>
      </span>
    </label>
  )
}
