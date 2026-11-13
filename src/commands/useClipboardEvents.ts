import { useEffect } from 'react'
import * as clipboard from './clipboard'

function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
}

/**
 * Liga copiar/recortar/colar aos eventos do navegador (Ctrl+C / Ctrl+X / Ctrl+V).
 * Assim o conteúdo passa pela área de transferência do sistema sem pedir permissão,
 * e pode ser colado em outra aba do app.
 */
export function useClipboardEvents(): void {
  useEffect(() => {
    const onCopy = (e: ClipboardEvent) => {
      if (isTyping(e.target) || window.getSelection()?.toString()) return
      const text = clipboard.copy()
      if (text === null) return
      e.clipboardData?.setData('text/plain', text)
      e.preventDefault()
    }
    const onCut = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      const text = clipboard.cut()
      if (text === null) return
      e.clipboardData?.setData('text/plain', text)
      e.preventDefault()
    }
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return
      if (clipboard.paste({ text: e.clipboardData?.getData('text/plain') })) e.preventDefault()
    }
    window.addEventListener('copy', onCopy)
    window.addEventListener('cut', onCut)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('copy', onCopy)
      window.removeEventListener('cut', onCut)
      window.removeEventListener('paste', onPaste)
    }
  }, [])
}
