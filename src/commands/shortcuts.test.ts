import { describe, expect, it } from 'vitest'
import { formatShortcut, normalizeShortcut, shortcutFromEvent, type KeyLike } from './shortcuts'

const key = (k: Partial<KeyLike> & { key: string }): KeyLike => ({
  code: '',
  ctrlKey: false,
  metaKey: false,
  altKey: false,
  shiftKey: false,
  ...k,
})

describe('normalizeShortcut', () => {
  it('ordena modificadores e normaliza nomes', () => {
    expect(normalizeShortcut('shift+ctrl+z')).toBe('Ctrl+Shift+Z')
    expect(normalizeShortcut('Cmd+Alt+c')).toBe('Ctrl+Alt+C')
    expect(normalizeShortcut('Delete')).toBe('Del')
    expect(normalizeShortcut('Escape')).toBe('Esc')
    expect(normalizeShortcut('Shift+1')).toBe('Shift+1')
    expect(normalizeShortcut('Ctrl++')).toBe('Ctrl++')
  })

  it('rejeita modificadores desconhecidos', () => {
    expect(() => normalizeShortcut('Super+Z')).toThrow()
  })
})

describe('shortcutFromEvent', () => {
  it('usa a posição física para letras e números', () => {
    expect(shortcutFromEvent(key({ key: 'z', code: 'KeyZ', ctrlKey: true }))).toBe('Ctrl+Z')
    expect(shortcutFromEvent(key({ key: 'Z', code: 'KeyZ', ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+Z')
    // Shift+1 produz "!" no layout US, mas o atalho continua sendo Shift+1
    expect(shortcutFromEvent(key({ key: '!', code: 'Digit1', shiftKey: true }))).toBe('Shift+1')
  })

  it('trata Cmd no macOS como Ctrl', () => {
    expect(shortcutFromEvent(key({ key: 'z', code: 'KeyZ', metaKey: true }))).toBe('Ctrl+Z')
  })

  it('reconhece "?" independentemente do layout', () => {
    expect(shortcutFromEvent(key({ key: '?', code: 'Slash', shiftKey: true }))).toBe('?')
    expect(shortcutFromEvent(key({ key: '?', code: 'IntlRo', shiftKey: true }))).toBe('?')
  })

  it('normaliza teclas especiais', () => {
    expect(shortcutFromEvent(key({ key: 'Delete', code: 'Delete' }))).toBe('Del')
    expect(shortcutFromEvent(key({ key: 'ArrowLeft', code: 'ArrowLeft', shiftKey: true }))).toBe('Shift+Left')
  })

  it('ignora modificadores sozinhos', () => {
    expect(shortcutFromEvent(key({ key: 'Shift', code: 'ShiftLeft', shiftKey: true }))).toBeNull()
  })
})

describe('formatShortcut', () => {
  it('usa símbolos no macOS', () => {
    expect(formatShortcut('Ctrl+Shift+Z', true)).toBe('⌘⇧Z')
    expect(formatShortcut('Ctrl+Shift+Z', false)).toBe('Ctrl+Shift+Z')
  })
})
