import { beforeEach, describe, expect, it } from 'vitest'
import { emptyProject } from '../model/testUtils'
import { drawRectRoom } from '../model/walls'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { contentBounds, exportLayout, MAX_SIDE, safePixelRatio } from './exportLayout'
import { hasUnsavedWork, loadProjectText, newProject, resetFileState } from './projectFile'
import { serializeProject } from './schema'

const doc = () => useProjectStore.getState()
const ed = () => useEditorStore.getState()
const draw = () => doc().update('cômodo', (d) => void drawRectRoom(d, { x: 0, y: 0 }, { x: 400, y: 300 }))

beforeEach(() => {
  doc().load(emptyProject())
  resetFileState()
  ed().setDialog(null)
  ed().clearNotice()
  ed().setSelection([])
})

describe('arquivo: novo e abrir', () => {
  it('projeto vazio não tem trabalho a perder', () => {
    expect(hasUnsavedWork()).toBe(false)
    newProject()
    expect(ed().dialog).toBeNull()
  })

  it('pede confirmação antes de descartar trabalho que não está em arquivo', () => {
    draw()
    expect(hasUnsavedWork()).toBe(true)
    newProject()
    const dialog = ed().dialog
    expect(dialog?.kind).toBe('confirm')
    expect(Object.keys(doc().project.walls)).toHaveLength(4) // nada mudou ainda
    if (dialog?.kind === 'confirm') dialog.onConfirm()
    expect(Object.keys(doc().project.walls)).toHaveLength(0)
    expect(doc().past).toHaveLength(0)
  })

  it('abrir um arquivo válido troca o projeto e marca como salvo', () => {
    draw()
    const text = serializeProject({ ...doc().project, name: 'Casa' })
    doc().load(emptyProject())
    ed().setSelection(['algo'])
    expect(loadProjectText(text, 'Casa.planbuilder.json')).toBe(true)
    expect(doc().project.name).toBe('Casa')
    expect(ed().file.name).toBe('Casa.planbuilder.json')
    expect(ed().selection).toEqual([])
    expect(hasUnsavedWork()).toBe(false)
    doc().update('outro cômodo', (d) => void drawRectRoom(d, { x: 1000, y: 0 }, { x: 1200, y: 200 }))
    expect(hasUnsavedWork()).toBe(true)
  })

  it('arquivo inválido avisa e mantém o projeto atual', () => {
    draw()
    expect(loadProjectText('{"qualquer":"coisa"}', 'foto.json')).toBe(false)
    expect(Object.keys(doc().project.walls)).toHaveLength(4)
    expect(ed().notice).toMatchObject({ kind: 'error' })
    expect(ed().notice!.text).toContain('foto.json')
  })
})

describe('exportar: enquadramento', () => {
  it('projeto vazio não tem o que exportar', () => {
    expect(contentBounds(emptyProject())).toBeNull()
    expect(exportLayout(emptyProject())).toBeNull()
  })

  it('enquadra a planta inteira com margem', () => {
    const p = emptyProject()
    drawRectRoom(p, { x: 1000, y: 2000 }, { x: 1400, y: 2300 })
    const l = exportLayout(p)!
    // 415 × 315 cm (com paredes) → maior lado com ~1000 px
    expect(l.scale).toBeCloseTo(1000 / 415)
    expect(l.width).toBe(1000 + 96)
    // o canto externo (992,5; 1992,5) cai exatamente na margem
    expect(992.5 * l.scale + l.x).toBeCloseTo(48)
    expect(1992.5 * l.scale + l.y).toBeCloseTo(48)
  })

  it('o giro tracejado da porta da geladeira entra no enquadramento', () => {
    const p = emptyProject()
    p.items.g = { id: 'g', componentId: 'appliance.fridge-duplex', x: 0, y: 0, rotation: 0, width: 62.1, depth: 75.5, height: 176, mirrored: false, params: {} }
    // a porta de 62,1 cm gira para a frente: o desenho vai até y = 37,75 + 62,1
    expect(contentBounds(p)!.maxY).toBeCloseTo(75.5 / 2 + 62.1)
  })

  it('plantas enormes não passam do tamanho máximo de imagem', () => {
    expect(safePixelRatio(4, 1096, 800)).toBe(4)
    expect(safePixelRatio(4, 3000, 2000) * 3000).toBeLessThanOrEqual(MAX_SIDE)
  })
})
