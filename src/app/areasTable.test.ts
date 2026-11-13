import { describe, expect, it } from 'vitest'
import { quantities } from '../model/quantities'
import { emptyProject } from '../model/testUtils'
import { drawRectRoom } from '../model/walls'
import { areasAsTsv } from './areasTable'

describe('areasAsTsv', () => {
  it('gera linhas separadas por tabulação, com vírgula decimal', () => {
    const p = emptyProject()
    drawRectRoom(p, { x: 0, y: 0 }, { x: 400, y: 300 })
    const lines = areasAsTsv(quantities(p)).split('\n')
    expect(lines[0]).toBe('Cômodo\tÁrea (m²)\tPerímetro (m)\tÁrea de parede (m²)')
    expect(lines[1]).toBe('Cômodo 1\t10,97\t13,40\t37,52')
    expect(lines).toContain('Área total construída (m²)\t13,07')
    expect(lines).toContain('Área útil (m²)\t10,97')
  })
})
