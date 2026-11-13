import { useEffect } from 'react'
import type { CommandRegistry } from './registry'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset'].includes(type)
  }
  return false
}

/** Liga os atalhos de teclado do registro à janela. Ignora teclas digitadas em campos de texto. */
export function useShortcuts(registry: CommandRegistry): void {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || isTypingTarget(e.target)) return
      const cmd = registry.findByEvent(e)
      if (!cmd) return
      // Mesmo desativado, o atalho é consumido para o navegador não agir (ex.: Ctrl+S salvar página).
      e.preventDefault()
      registry.execute(cmd.id)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [registry])
}
