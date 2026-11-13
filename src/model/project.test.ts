import { describe, expect, it } from 'vitest'
import { createEmptyProject, DEFAULT_SETTINGS } from './project'
import { SCHEMA_VERSION } from './types'

describe('createEmptyProject', () => {
  it('cria um documento vazio na versão atual do esquema', () => {
    const p = createEmptyProject('Casa', new Date('2026-01-02T03:04:05Z'))
    expect(p.schemaVersion).toBe(SCHEMA_VERSION)
    expect(p.name).toBe('Casa')
    expect(p.createdAt).toBe('2026-01-02T03:04:05.000Z')
    expect(p.settings).toEqual(DEFAULT_SETTINGS)
    expect(p.walls).toEqual({})
    expect(p.id).toMatch(/^[\w-]{10}$/)
  })

  it('gera ids diferentes', () => {
    expect(createEmptyProject().id).not.toBe(createEmptyProject().id)
  })

  it('não compartilha as configurações padrão entre projetos', () => {
    const p = createEmptyProject()
    p.settings.gridSize = 50
    expect(DEFAULT_SETTINGS.gridSize).toBe(10)
  })
})
