import { beforeEach, describe, expect, it } from 'vitest'
import { counts, emptyProject, segments } from '../../model/testUtils'
import { drawRectRoom, drawWallSegment } from '../../model/walls'
import { useEditorStore } from '../../store/editorStore'
import { useProjectStore } from '../../store/projectStore'
import { useInteractionStore } from '../interactionStore'
import { tools } from './index'
import type { PointerInfo } from './types'

const doc = () => useProjectStore.getState()
const ed = () => useEditorStore.getState()

/** Evento de ponteiro com 1 px por cm e a vista na origem (tela = mundo). */
const ev = (x: number, y: number, extra: Partial<PointerInfo> = {}): PointerInfo => ({
  world: { x, y },
  screen: { x, y },
  shift: false,
  alt: false,
  ctrl: false,
  button: 0,
  ...extra,
})

function click(tool: keyof typeof tools, x: number, y: number, extra: Partial<PointerInfo> = {}) {
  const t = tools[tool]
  t.onPointerMove?.(ev(x, y, extra))
  t.onPointerDown?.(ev(x, y, extra))
  t.onPointerUp?.(ev(x, y, extra))
}

function drag(tool: keyof typeof tools, from: [number, number], to: [number, number], extra: Partial<PointerInfo> = {}) {
  const t = tools[tool]
  t.onPointerMove?.(ev(...from, extra))
  t.onPointerDown?.(ev(...from, extra))
  const steps = 5
  for (let i = 1; i <= steps; i++) {
    t.onPointerMove?.(ev(from[0] + ((to[0] - from[0]) * i) / steps, from[1] + ((to[1] - from[1]) * i) / steps, extra))
  }
  t.onPointerUp?.(ev(...to, extra))
}

const type = (tool: keyof typeof tools, text: string) => {
  for (const ch of text) tools[tool].onKeyDown?.({ key: ch })
}
const key = (tool: keyof typeof tools, k: string) => tools[tool].onKeyDown?.({ key: k })

beforeEach(() => {
  doc().load(emptyProject())
  ed().setView({ x: 0, y: 0, scale: 1 })
  ed().setSelection([])
  ed().setTool('select')
  useInteractionStore.getState().reset()
})

describe('ferramenta Parede', () => {
  beforeEach(() => ed().setTool('wall'))

  it('desenha paredes encadeadas, uma por clique, cada uma desfazível', () => {
    click('wall', 0, 0)
    click('wall', 400, 0)
    click('wall', 400, 300)
    key('wall', 'Escape')
    expect(segments(doc().project)).toEqual(['0,0-400,0', '400,0-400,300'])
    expect(doc().past.map((e) => e.label)).toEqual(['Parede criada', 'Parede criada'])
    doc().undo()
    expect(segments(doc().project)).toEqual(['0,0-400,0'])
  })

  it('fecha o contorno ao clicar no ponto inicial e encerra', () => {
    click('wall', 0, 0)
    click('wall', 400, 0)
    click('wall', 400, 300)
    click('wall', 0, 300)
    click('wall', 2, 3) // perto do início: o snap leva ao nó (0,0)
    expect(counts(doc().project)).toEqual({ nodes: 4, walls: 4 })
    expect(useInteractionStore.getState().draft).toBeNull()
  })

  it('aceita o comprimento digitado na direção do cursor', () => {
    click('wall', 0, 0)
    tools.wall.onPointerMove?.(ev(0, 200)) // apontando para baixo
    type('wall', '3,5m')
    key('wall', 'Enter')
    key('wall', 'Escape')
    expect(segments(doc().project)).toEqual(['0,0-0,350'])
  })

  it('Esc cancela sem criar nada', () => {
    click('wall', 0, 0)
    tools.wall.onPointerMove?.(ev(300, 0))
    expect(key('wall', 'Escape')).toBe(true)
    expect(counts(doc().project).walls).toBe(0)
  })

  it('não consome teclas quando não está desenhando (atalhos continuam funcionando)', () => {
    expect(key('wall', '5')).toBe(false)
    expect(key('wall', 'Escape')).toBe(false)
  })

  it('trocar de ferramenta descarta o desenho pela metade', () => {
    click('wall', 0, 0)
    ed().setTool('select')
    ed().setTool('wall')
    click('wall', 400, 0)
    expect(counts(doc().project).walls).toBe(0)
  })
})

describe('ferramenta Cômodo', () => {
  beforeEach(() => ed().setTool('room'))

  it('arrastar cria 4 paredes', () => {
    drag('room', [0, 0], [400, 300])
    expect(counts(doc().project)).toEqual({ nodes: 4, walls: 4 })
    expect(doc().past.map((e) => e.label)).toEqual(['Cômodo criado'])
  })

  it('clique em dois cantos também funciona', () => {
    click('room', 0, 0)
    click('room', 300, 200)
    expect(counts(doc().project).walls).toBe(4)
  })

  it('medida digitada respeita o lado do cursor', () => {
    click('room', 0, 0)
    tools.room.onPointerMove?.(ev(-50, -50))
    type('room', '400x300')
    key('room', 'Enter')
    expect(segments(doc().project)).toEqual(['-400,-300--400,0', '-400,-300-0,-300', '-400,0-0,0', '0,-300-0,0'])
  })
})

describe('ferramenta Selecionar', () => {
  beforeEach(() => {
    doc().update('setup', (d) => {
      drawRectRoom(d, { x: 0, y: 0 }, { x: 400, y: 300 })
    })
  })

  const wallAt = (x: number, y: number) =>
    Object.values(doc().project.walls).find((w) => {
      const a = doc().project.nodes[w.a]!
      const b = doc().project.nodes[w.b]!
      return Math.min(a.x, b.x) <= x && x <= Math.max(a.x, b.x) && Math.min(a.y, b.y) <= y && y <= Math.max(a.y, b.y)
    })!

  it('clique seleciona; Shift+clique adiciona; clique no vazio limpa', () => {
    click('select', 200, 0)
    expect(ed().selection).toEqual([wallAt(200, 0).id])
    click('select', 400, 150, { shift: true })
    expect(ed().selection).toHaveLength(2)
    click('select', 1000, 1000)
    expect(ed().selection).toEqual([])
  })

  it('caixa da esquerda para a direita pega só o que está inteiro dentro', () => {
    drag('select', [-50, -50], [450, 100])
    expect(ed().selection).toEqual([wallAt(200, 0).id])
  })

  it('caixa da direita para a esquerda pega tudo que toca', () => {
    drag('select', [450, 100], [-50, -50])
    expect(ed().selection).toHaveLength(3)
  })

  it('arrastar parede a move em paralelo, em um único passo de desfazer', () => {
    const before = doc().past.length
    drag('select', [200, 0], [200, -100])
    expect(segments(doc().project)).toEqual(['0,-100-0,300', '0,-100-400,-100', '0,300-400,300', '400,-100-400,300'])
    expect(doc().past.length).toBe(before + 1)
    doc().undo()
    expect(segments(doc().project)).toEqual(['0,0-0,300', '0,0-400,0', '0,300-400,300', '400,0-400,300'])
  })

  it('arrastar canto move o canto', () => {
    drag('select', [400, 300], [500, 300])
    expect(segments(doc().project)).toContain('400,0-500,300')
  })

  it('Esc durante o arraste cancela', () => {
    const t = tools.select
    t.onPointerMove?.(ev(200, 0))
    t.onPointerDown?.(ev(200, 0))
    t.onPointerMove?.(ev(200, -60))
    expect(key('select', 'Escape')).toBe(true)
    t.onPointerUp?.(ev(200, -60))
    expect(segments(doc().project)).toContain('0,0-400,0')
  })

  it('duplo clique na parede insere um nó', () => {
    tools.select.onDoubleClick?.(ev(150, 2))
    expect(counts(doc().project)).toEqual({ nodes: 5, walls: 5 })
  })
})

describe('ferramenta Excluir', () => {
  it('clique exclui a parede sob o cursor', () => {
    doc().update('setup', (d) => {
      drawWallSegment(d, { x: 0, y: 0 }, { x: 400, y: 0 })
    })
    ed().setTool('erase')
    click('erase', 200, 5)
    expect(counts(doc().project)).toEqual({ nodes: 0, walls: 0 })
  })
})
