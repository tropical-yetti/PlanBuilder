import { beforeEach, describe, expect, it } from 'vitest'
import { addText } from '../model/annotations'
import { addOpening } from '../model/openings'
import { counts, emptyProject, segments } from '../model/testUtils'
import { drawRectRoom, drawWallSegment } from '../model/walls'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { registerBuiltinCommands } from './builtin'
import * as clipboard from './clipboard'
import { registerEditingCommands } from './editing'
import { CommandRegistry } from './registry'

const doc = () => useProjectStore.getState()
const ed = () => useEditorStore.getState()
const P = (x: number, y: number) => ({ x, y })
let reg: CommandRegistry

beforeEach(() => {
  reg = new CommandRegistry()
  registerBuiltinCommands(reg)
  registerEditingCommands(reg) // lança erro se houver atalho repetido
  doc().load(emptyProject())
  ed().setSelection([])
  ed().setContextMenu(null)
  ed().setView({ x: 0, y: 0, scale: 1 })
  ed().setCanvasSize({ width: 1000, height: 800 })
  clipboard.resetClipboard()
})

const wallIds = () => Object.keys(doc().project.walls)

describe('comandos de produtividade', () => {
  it('todos os atalhos são únicos e nenhum colide com o navegador', () => {
    for (const s of ['Ctrl+R', 'Ctrl+L', 'Ctrl+W', 'Ctrl+T', 'Ctrl+N', 'Ctrl+C', 'Ctrl+V', 'Ctrl+X']) {
      expect(reg.findByShortcut(s), s).toBeUndefined()
    }
    expect(reg.findByShortcut('Ctrl+D')?.id).toBe('edit.duplicate')
    expect(reg.findByShortcut('?')?.id).toBe('app.shortcuts')
  })

  it('duplicar repete o deslocamento da cópia anterior', () => {
    doc().update('setup', (d) => void drawWallSegment(d, P(0, 0), P(100, 0)))
    ed().setSelection(wallIds())
    reg.execute('edit.duplicate')
    expect(segments(doc().project)).toEqual(['0,0-100,0', '120,20-20,20'])
    // o usuário move a cópia; a próxima duplicação repete esse passo
    const copyId = ed().selection[0]!
    doc().update('mover', (d) => {
      const w = d.walls[copyId]!
      for (const n of [w.a, w.b]) {
        d.nodes[n]!.y = 200
        d.nodes[n]!.x -= 20
      }
    })
    reg.execute('edit.duplicate')
    reg.execute('edit.duplicate')
    expect(segments(doc().project)).toEqual(['0,0-100,0', '0,200-100,200', '0,400-100,400', '0,600-100,600'])
  })

  it('copiar, recortar e colar (colar centraliza no meio da tela quando o cursor está fora)', () => {
    doc().update('setup', (d) => void drawRectRoom(d, P(0, 0), P(100, 100)))
    ed().setSelection(wallIds())
    const json = clipboard.copy()!
    expect(reg.isEnabled('edit.paste')).toBe(true)
    clipboard.paste()
    expect(counts(doc().project)).toEqual({ nodes: 8, walls: 8 })
    // centro da tela 1000×800 = (500, 400) → cantos em 450..550, 350..450
    expect(Object.values(doc().project.nodes).filter((n) => n.x === 450 && n.y === 350)).toHaveLength(1)
    reg.execute('edit.cut')
    expect(counts(doc().project)).toEqual({ nodes: 4, walls: 4 })
    // colar a partir do texto do sistema (outra aba)
    doc().load(emptyProject())
    clipboard.resetClipboard()
    expect(clipboard.paste({ text: 'texto qualquer' })).toBe(false)
    expect(clipboard.paste({ text: json, inPlace: true })).toBe(true)
    expect(segments(doc().project)).toEqual(['0,0-0,100', '0,0-100,0', '0,100-100,100', '100,0-100,100'])
  })

  it('setas movem paredes; portas selecionadas sozinhas deslizam pela parede', () => {
    doc().update('setup', (d) => {
      const [w] = drawWallSegment(d, P(0, 0), P(400, 0)).wallIds
      addOpening(d, { wallId: w!, componentId: 'door.swing-single', offset: 100, width: 80, height: 210, sillHeight: 0, flipSide: false, flipHinge: false, params: {} })
    })
    const door = Object.keys(doc().project.openings)[0]!
    ed().setSelection([door])
    reg.execute('edit.nudgeRightBig')
    expect(doc().project.openings[door]!.offset).toBe(110)
    ed().setSelection(wallIds())
    reg.execute('edit.nudgeDown')
    expect(segments(doc().project)).toEqual(['0,1-400,1'])
    expect(doc().project.openings[door]!.offset).toBe(110)
  })

  it('girar, espelhar e desfazer', () => {
    doc().update('setup', (d) => void drawWallSegment(d, P(0, 0), P(200, 0)))
    ed().setSelection(wallIds())
    reg.execute('edit.rotateCw')
    expect(segments(doc().project)).toEqual(['100,-100-100,100'])
    doc().undo()
    expect(segments(doc().project)).toEqual(['0,0-200,0'])
  })

  it('bloquear tira da seleção, do selecionar tudo e do excluir; desbloquear tudo devolve', () => {
    doc().update('setup', (d) => {
      drawWallSegment(d, P(0, 0), P(200, 0))
      drawWallSegment(d, P(0, 100), P(200, 100))
    })
    const [a, b] = wallIds()
    ed().setSelection([a!])
    reg.execute('edit.lock')
    expect(ed().selection).toEqual([])
    reg.execute('edit.selectAll')
    expect(ed().selection).toEqual([b])
    ed().setSelection([a!, b!])
    reg.execute('edit.delete')
    expect(wallIds()).toEqual([a])
    reg.execute('edit.unlockAll')
    reg.execute('edit.selectAll')
    expect(ed().selection).toEqual([a])
  })

  it('alinhar só fica disponível com dois ou mais blocos', () => {
    doc().update('setup', (d) => {
      addText(d, P(0, 0), 'a')
      addText(d, P(100, 50), 'b')
    })
    const ids = Object.keys(doc().project.texts)
    ed().setSelection([ids[0]!])
    expect(reg.isEnabled('align.left')).toBe(false)
    ed().setSelection(ids)
    expect(reg.isEnabled('align.left')).toBe(true)
    reg.execute('align.top')
    expect(new Set(Object.values(doc().project.texts).map((t) => t.y)).size).toBe(1)
  })

  it('camadas e histórico', () => {
    reg.execute('layer.grid')
    expect(ed().layers.grid).toBe(false)
    reg.execute('layer.grid')
    doc().update('um', (d) => void drawWallSegment(d, P(0, 0), P(100, 0)))
    doc().update('dois', (d) => void drawWallSegment(d, P(0, 100), P(100, 100)))
    doc().update('três', (d) => void drawWallSegment(d, P(0, 200), P(100, 200)))
    doc().goTo(1)
    expect(wallIds()).toHaveLength(1)
    doc().goTo(3)
    expect(wallIds()).toHaveLength(3)
    doc().goTo(0)
    expect(wallIds()).toHaveLength(0)
  })
})
