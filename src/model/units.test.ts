import { describe, expect, it } from 'vitest'
import { formatCmValue, formatMeters, parseLength, parseSize } from './units'

describe('parseLength', () => {
  it('lê centímetros por padrão', () => {
    expect(parseLength('350')).toBe(350)
    expect(parseLength(' 350 cm ')).toBe(350)
    expect(parseLength('12,5')).toBe(12.5)
  })
  it('lê metros e milímetros', () => {
    expect(parseLength('3,5m')).toBe(350)
    expect(parseLength('3.5 m')).toBe(350)
    expect(parseLength('35mm')).toBe(3.5)
  })
  it('rejeita entradas inválidas', () => {
    expect(parseLength('')).toBeNull()
    expect(parseLength('abc')).toBeNull()
    expect(parseLength('-5')).toBeNull()
    expect(parseLength('3,5,1')).toBeNull()
  })
})

describe('parseSize', () => {
  it('lê largura x profundidade', () => {
    expect(parseSize('400x300')).toEqual({ w: 400, h: 300 })
    expect(parseSize('4m x 3,5m')).toEqual({ w: 400, h: 350 })
    expect(parseSize('400')).toBeNull()
    expect(parseSize('0x300')).toBeNull()
  })
})

describe('formatação', () => {
  it('formata em pt-BR', () => {
    expect(formatMeters(350)).toBe('3,50 m')
    expect(formatCmValue(1250)).toBe('1250')
    expect(formatCmValue(352.54)).toBe('352,5')
  })
})
