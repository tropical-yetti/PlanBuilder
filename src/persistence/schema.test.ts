import { describe, expect, it } from 'vitest'
import { addDimension, addText } from '../model/annotations'
import { addOpening } from '../model/openings'
import { emptyProject } from '../model/testUtils'
import { drawRectRoom } from '../model/walls'
import { fileNameFor, parseProjectData, parseProjectText, serializeProject } from './schema'

function sample() {
  const p = emptyProject()
  const [w] = drawRectRoom(p, { x: 0, y: 0 }, { x: 400, y: 300 })
  addOpening(p, { wallId: w!, componentId: 'door.swing-single', offset: 200, width: 80, height: 210, sillHeight: 0, flipSide: true, flipHinge: false, params: { a: 1 } })
  addText(p, { x: 10, y: 10 }, 'Sala')
  addDimension(p, { x: 0, y: 0 }, { x: 400, y: 0 })
  p.roomLabels.r = { id: 'r', x: 200, y: 150, name: 'Sala' }
  p.walls[w!]!.locked = true
  return p
}

describe('arquivo de projeto', () => {
  it('salvar e abrir devolve o mesmo projeto', () => {
    const p = sample()
    const r = parseProjectText(serializeProject(p, new Date('2026-05-05T10:00:00Z')))
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.warnings).toEqual([])
    expect(r.project).toEqual({ ...p, updatedAt: '2026-05-05T10:00:00.000Z' })
  })

  it('aceita também o projeto sem o envelope', () => {
    const p = sample()
    const r = parseProjectData(JSON.parse(JSON.stringify(p)))
    expect(r.ok && r.project).toEqual(p)
  })

  it('recusa o que não é projeto, com mensagem clara', () => {
    for (const text of ['', 'não é json', '[]', '{}', '{"schemaVersion":1}', '{"app":"outro","project":{"x":1}}']) {
      const r = parseProjectText(text)
      expect(r.ok, text).toBe(false)
    }
    const future = parseProjectData({ ...sample(), schemaVersion: 99 })
    expect(!future.ok && future.error).toMatch(/versão mais nova/)
  })

  it('completa campos ausentes de arquivos antigos', () => {
    const old: Record<string, unknown> = { ...sample(), settings: { gridSize: 10 } }
    for (const key of ['dimensions', 'texts', 'roomLabels', 'items']) delete old[key]
    const r = parseProjectData(old)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.project.dimensions).toEqual({})
    expect(r.project.settings).toEqual({ gridSize: 10, defaultWallThickness: 15, defaultWallHeight: 280 })
  })

  it('descarta objetos quebrados e avisa, sem perder o resto', () => {
    const p = JSON.parse(JSON.stringify(sample()))
    const wallId = Object.keys(p.walls)[0] as string
    p.walls.quebrada = { id: 'quebrada', a: 'nao-existe', b: 'tambem-nao', thickness: 15, height: 280 }
    p.walls.semMedida = { ...p.walls[wallId], id: 'semMedida', thickness: 'x' }
    p.openings.solta = { id: 'solta', wallId: 'nao-existe', componentId: 'x', offset: 1, width: 1, height: 1 }
    p.nodes.orfao = { id: 'orfao', x: 5, y: 5 }
    p.nodes.nan = { id: 'nan', x: null, y: 0 }
    const r = parseProjectData(p)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.project.walls)).toHaveLength(4)
    expect(Object.keys(r.project.openings)).toHaveLength(1)
    expect(r.project.nodes.orfao).toBeUndefined()
    expect(r.warnings).toEqual(['2 paredes inválidas foram descartadas', '1 porta ou janela inválida foi descartada'])
  })
})

describe('fileNameFor', () => {
  it('remove caracteres proibidos e mantém acentos', () => {
    expect(fileNameFor('Casa da Praia')).toBe('Casa da Praia.planbuilder.json')
    expect(fileNameFor('a/b:c*?"<>|d')).toBe('a b c d.planbuilder.json')
    expect(fileNameFor('  ..  ')).toBe('projeto.planbuilder.json')
    expect(fileNameFor('Sobrado – 2º andar', '.png')).toBe('Sobrado – 2º andar.png')
  })
})
