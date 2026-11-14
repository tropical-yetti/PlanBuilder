/**
 * Atalhos de teclado em formato canônico: modificadores na ordem Ctrl, Alt, Shift, seguidos da tecla.
 * Exemplos: "Ctrl+Z", "Ctrl+Shift+Z", "Shift+1", "Del", "?".
 * "Ctrl" representa Ctrl no Windows/Linux e Cmd no macOS.
 */

const MODIFIERS = ['Ctrl', 'Alt', 'Shift'] as const

const KEY_ALIASES: Record<string, string> = {
  ' ': 'Space',
  Spacebar: 'Space',
  Escape: 'Esc',
  Delete: 'Del',
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
}

function normalizeKeyName(key: string): string {
  const alias = KEY_ALIASES[key]
  if (alias) return alias
  return key.length === 1 ? key.toUpperCase() : key
}

/** Normaliza um atalho escrito à mão ("shift+ctrl+z" → "Ctrl+Shift+Z"). */
export function normalizeShortcut(shortcut: string): string {
  const parts = shortcut.split('+').map((p) => p.trim())
  // "Ctrl++" ou "+" significam a tecla "+"
  const rawKey = shortcut.endsWith('++') || shortcut === '+' ? '+' : (parts.pop() ?? '')
  const mods = new Set(
    parts
      .filter((p) => p !== '')
      .map((p) => {
        const lower = p.toLowerCase()
        if (lower === 'cmd' || lower === 'meta' || lower === 'control' || lower === 'ctrl') return 'Ctrl'
        if (lower === 'option' || lower === 'alt') return 'Alt'
        if (lower === 'shift') return 'Shift'
        throw new Error(`Modificador desconhecido no atalho "${shortcut}": ${p}`)
      }),
  )
  const ordered = MODIFIERS.filter((m) => mods.has(m))
  return [...ordered, normalizeKeyName(rawKey)].join('+')
}

export interface KeyLike {
  key: string
  code: string
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
}

/** Converte um evento de teclado no atalho canônico correspondente, ou null para teclas de modificador sozinhas. */
export function shortcutFromEvent(e: KeyLike): string | null {
  if (['Control', 'Meta', 'Alt', 'Shift', 'OS'].includes(e.key)) return null

  // "?" é tratado pelo caractere produzido: a posição da tecla varia entre layouts (US, ABNT2).
  if (e.key === '?') {
    return [e.ctrlKey || e.metaKey ? 'Ctrl' : null, e.altKey ? 'Alt' : null, '?'].filter(Boolean).join('+')
  }

  let key: string
  if (/^Key[A-Z]$/.test(e.code)) key = e.code.slice(3)
  else if (/^Digit[0-9]$/.test(e.code)) key = e.code.slice(5)
  else if (/^Numpad[0-9]$/.test(e.code)) key = e.code.slice(6)
  else key = normalizeKeyName(e.key)

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey) parts.push('Shift')
  parts.push(key)
  return parts.join('+')
}

/** Texto para exibir o atalho na interface (no macOS, "Ctrl" vira "⌘"). */
export function formatShortcut(shortcut: string, isMac: boolean): string {
  if (!isMac) return shortcut
  return shortcut.replace(/\bCtrl\b/g, '⌘').replace(/\bAlt\b/g, '⌥').replace(/\bShift\b/g, '⇧').replace(/\+/g, '')
}

export const isMacPlatform = (): boolean =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
