import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { quantities } from '../../model/quantities'
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

describe('inserir portas e janelas', () => {
  beforeEach(() => {
    doc().update('setup', (d) => {
      drawRectRoom(d, { x: 0, y: 0 }, { x: 400, y: 300 })
    })
  })
  const openings = () => Object.values(doc().project.openings)

  it('clique perto da parede insere a porta presa a ela, abrindo para o lado do cursor', () => {
    ed().startPlacing('door.swing-single')
    click('place', 150, 20) // abaixo da parede de cima (lado de dentro)
    expect(openings()).toHaveLength(1)
    const o = openings()[0]!
    expect(o.componentId).toBe('door.swing-single')
    expect(o.width).toBe(80)
    expect(ed().selection).toEqual([o.id])
    expect(doc().past.at(-1)!.label).toBe('Porta inserida')
    // do outro lado da parede, o lado de abertura inverte
    click('place', 300, -20)
    expect(openings()).toHaveLength(2)
    expect(openings()[1]!.flipSide).toBe(!o.flipSide)
  })

  it('gruda no centro da parede', () => {
    ed().startPlacing('window.sliding')
    click('place', 204, 5)
    expect(openings()[0]!.offset).toBe(200)
    expect(openings()[0]!.sillHeight).toBe(100)
    expect(openings()[0]!.params).toEqual({ leaves: 2 })
  })

  it('não insere longe das paredes nem em cima de outra abertura', () => {
    ed().startPlacing('door.swing-single')
    click('place', 200, 150)
    expect(openings()).toHaveLength(0)
    click('place', 200, 5)
    click('place', 230, 5)
    expect(openings()).toHaveLength(1)
    expect(useInteractionStore.getState().draft).toMatchObject({ kind: 'opening', valid: false })
  })

  it('perto da ponta, a abertura é trazida para dentro da parede', () => {
    ed().startPlacing('door.swing-single')
    click('place', 10, 5)
    expect(openings()).toHaveLength(1)
    const o = openings()[0]!
    const w = doc().project.walls[o.wallId]!
    const fromA = doc().project.nodes[w.a]!.x === 0
    expect(fromA ? o.offset : 400 - o.offset).toBe(45) // 5 cm de margem + meia largura
  })

  it('Esc sai do modo de inserção', () => {
    ed().startPlacing('door.swing-single')
    expect(key('place', 'Escape')).toBe(true)
    expect(ed().tool).toBe('select')
    expect(ed().placing).toBeNull()
  })

  it('arrastar a abertura a desliza pela parede; excluir a parede leva a abertura junto', () => {
    ed().startPlacing('door.swing-single')
    click('place', 200, 5)
    ed().setTool('select')
    const id = openings()[0]!.id
    const before = openings()[0]!.offset
    drag('select', [200, 0], [260, 0])
    expect(Math.abs(openings()[0]!.offset - before)).toBe(60)
    expect(doc().past.at(-1)!.label).toBe('Abertura movida')
    // levar para outra parede
    drag('select', [openings()[0]!.offset === 260 ? 260 : 140, 0], [400, 150])
    const o = openings()[0]!
    const w = doc().project.walls[o.wallId]!
    expect(doc().project.nodes[w.a]!.x).toBe(400)
    expect(doc().project.nodes[w.b]!.x).toBe(400)
    ed().setTool('erase')
    click('erase', 400, 20)
    expect(doc().project.openings[id]).toBeUndefined()
  })
})

describe('medir, cota e texto', () => {
  it('medir mostra a distância sem alterar o projeto', () => {
    ed().setTool('measure')
    click('measure', 0, 0)
    tools.measure.onPointerMove?.(ev(300, 0))
    click('measure', 300, 0)
    expect(useInteractionStore.getState().draft).toEqual({ kind: 'measure', a: { x: 0, y: 0 }, b: { x: 300, y: 0 } })
    expect(doc().past).toHaveLength(0)
    expect(key('measure', 'Escape')).toBe(true)
    expect(useInteractionStore.getState().draft).toBeNull()
  })

  it('cota: dois pontos e o afastamento', () => {
    ed().setTool('dimension')
    click('dimension', 0, 0)
    click('dimension', 400, 0)
    click('dimension', 200, -42) // 42 cm acima → arredonda para 40, do lado de cima
    const dims = Object.values(doc().project.dimensions)
    expect(dims).toHaveLength(1)
    expect(dims[0]).toMatchObject({ p1: { x: 0, y: 0 }, p2: { x: 400, y: 0 }, offset: -40 })
    expect(ed().selection).toEqual([dims[0]!.id])
  })

  it('texto: clicar abre o campo de edição no ponto', () => {
    ed().setTool('text')
    click('text', 120.4, 80.6)
    expect(ed().textEdit).toEqual({ id: null, at: { x: 120, y: 81 }, initial: '' })
    ed().setTool('select')
    expect(ed().textEdit).toBeNull()
  })

  it('arrastar com vários objetos selecionados move tudo, em um passo', () => {
    doc().update('setup', (d) => {
      drawWallSegment(d, { x: 0, y: 0 }, { x: 200, y: 0 })
      drawWallSegment(d, { x: 0, y: 100 }, { x: 200, y: 100 })
    })
    ed().setSelection(Object.keys(doc().project.walls))
    const steps = doc().past.length
    drag('select', [100, 0], [150, 30])
    expect(segments(doc().project)).toEqual(['250,130-50,130', '250,30-50,30'])
    expect(doc().past.length).toBe(steps + 1)
  })

  it('objetos bloqueados não são selecionados por clique nem por caixa', () => {
    doc().update('setup', (d) => {
      const [w] = drawWallSegment(d, { x: 0, y: 0 }, { x: 200, y: 0 }).wallIds
      d.walls[w!]!.locked = true
    })
    click('select', 100, 0)
    expect(ed().selection).toEqual([])
    drag('select', [300, 100], [-100, -100])
    expect(ed().selection).toEqual([])
  })
})

describe('móveis e cobogó na planta', () => {
  beforeEach(() => {
    doc().update('setup', (d) => {
      drawRectRoom(d, { x: 0, y: 0 }, { x: 600, y: 400 })
    })
  })
  const items = () => Object.values(doc().project.items)

  it('sofá perto da parede encosta o fundo nela; longe, fica solto', () => {
    ed().startPlacing('furniture.sofa-3')
    click('place', 300, 60) // a 60 cm da parede de cima: encosta (face interna em 7,5)
    expect(items()).toHaveLength(1)
    expect(items()[0]).toMatchObject({ x: 300, y: 52.5, rotation: 0, width: 210, depth: 90 })
    expect(doc().past.at(-1)!.label).toBe('Móvel inserido')
    click('place', 300, 200) // no meio do cômodo: solto
    expect(items()[1]).toMatchObject({ x: 300, y: 200, rotation: 0 })
  })

  it('perto da parede da direita, a cama vira o fundo para ela', () => {
    ed().startPlacing('furniture.bed-double')
    click('place', 520, 200)
    expect(items()[0]).toMatchObject({ x: 600 - 7.5 - 94, y: 200, rotation: 90 })
  })

  it('R gira o móvel antes de inserir; mesa não encosta na parede', () => {
    ed().startPlacing('furniture.table-rect')
    key('place', 'r')
    click('place', 300, 60)
    expect(items()[0]).toMatchObject({ x: 300, y: 60, rotation: 90 })
  })

  it('arrastar o móvel o move e, perto da parede, ele encosta', () => {
    ed().startPlacing('furniture.armchair')
    click('place', 300, 200)
    ed().setTool('select')
    const id = items()[0]!.id
    drag('select', [300, 200], [150, 180])
    expect(doc().project.items[id]).toMatchObject({ x: 150, y: 180, rotation: 0 })
    drag('select', [150, 180], [60, 180]) // perto da parede da esquerda
    expect(doc().project.items[id]).toMatchObject({ x: 47.5, y: 180, rotation: 270 })
    expect(doc().past.at(-1)!.label).toBe('Móvel movido')
    // Excluir pela ferramenta
    ed().setTool('erase')
    click('erase', 47.5, 180)
    expect(items()).toHaveLength(0)
  })

  it('painel de cobogó ocupa a altura da parede ao ser inserido', () => {
    ed().startPlacing('cobogo.panel')
    click('place', 300, 3)
    const o = Object.values(doc().project.openings)[0]!
    expect(o).toMatchObject({ componentId: 'cobogo.panel', height: 280, sillHeight: 0, width: 150 })
    expect(doc().past.at(-1)!.label).toBe('Cobogó inserido')
  })
})

describe('trava de direção ao arrastar (Shift ou Ctrl)', () => {
  /** Arrasta com a tecla de trava pressionada só depois do clique (como acontece na prática com Ctrl). */
  function lockedDrag(from: [number, number], to: [number, number], key: 'shift' | 'ctrl' = 'ctrl', pressFirst = false) {
    const t = tools.select
    const mod = { [key]: true }
    t.onPointerMove?.(ev(...from))
    t.onPointerDown?.(ev(...from, pressFirst ? mod : {}))
    for (let i = 1; i <= 5; i++) t.onPointerMove?.(ev(from[0] + ((to[0] - from[0]) * i) / 5, from[1] + ((to[1] - from[1]) * i) / 5, mod))
    t.onPointerUp?.(ev(...to, mod))
  }

  beforeEach(() => {
    // sala 400 × 300 dividida por uma parede interna em x = 250: a parede de cima fica em dois trechos
    doc().update('setup', (d) => {
      drawRectRoom(d, { x: 0, y: 0 }, { x: 400, y: 300 })
      drawWallSegment(d, { x: 250, y: 0 }, { x: 250, y: 300 })
    })
  })

  it('sem a trava, mover um trecho entorta o trecho vizinho', () => {
    drag('select', [100, 0], [100, -50])
    expect(segments(doc().project)).toContain('0,-50-250,-50')
    // o trecho da direita ficou inclinado (de 250,-50 a 400,0)
    expect(segments(doc().project)).toContain('250,-50-400,0')
  })

  it('com a trava, a linha reta inteira anda junto e nenhuma parede muda de ângulo', () => {
    lockedDrag([100, 0], [130, -50])
    expect(segments(doc().project)).toEqual([
      '0,-50-0,300',
      '0,-50-250,-50',
      '0,300-250,300',
      '250,-50-250,300',
      '250,-50-400,-50',
      '250,300-400,300',
      '400,-50-400,300',
    ])
    expect(doc().past.at(-1)!.label).toBe('Parede movida')
  })

  it('Shift apertado antes do clique também arrasta com a trava; sem mover, alterna a seleção', () => {
    lockedDrag([100, 0], [100, -50], 'shift', true)
    expect(segments(doc().project)).toContain('250,-50-400,-50')
    // o trecho da direita (agora em y = −50, de x = 250 a 400)
    const right = Object.values(doc().project.walls).find((w) => {
      const [a, b2] = [doc().project.nodes[w.a]!, doc().project.nodes[w.b]!]
      return a.y === -50 && b2.y === -50 && Math.min(a.x, b2.x) === 250
    })!
    ed().setSelection([])
    tools.select.onPointerDown?.(ev(320, -50, { shift: true }))
    tools.select.onPointerUp?.(ev(320, -50, { shift: true }))
    expect(ed().selection).toEqual([right.id])
    // de novo: Shift+clique sem mover tira da seleção
    tools.select.onPointerDown?.(ev(320, -50, { shift: true }))
    tools.select.onPointerUp?.(ev(320, -50, { shift: true }))
    expect(ed().selection).toEqual([])
  })

  it('canto travado anda só na direção predominante', () => {
    lockedDrag([400, 300], [460, 310])
    expect(doc().project.nodes[Object.keys(doc().project.nodes).find((id) => doc().project.nodes[id]!.x === 460)!]).toMatchObject({ x: 460, y: 300 })
  })

  it('grupo e móvel travados andam só na horizontal ou na vertical', () => {
    doc().update('textos', (d) => {
      d.texts.t = { id: 't', x: 100, y: 100, text: 'A', size: 20, rotation: 0 }
      d.items.m = { id: 'm', componentId: 'furniture.armchair', x: 150, y: 200, rotation: 0, width: 80, depth: 80, height: 85, mirrored: false, params: {} }
    })
    ed().setSelection([])
    lockedDrag([100, 100], [113, 160])
    expect(doc().project.texts.t).toMatchObject({ x: 100, y: 160 })
    lockedDrag([150, 200], [200, 210])
    expect(doc().project.items.m).toMatchObject({ x: 200, y: 200, rotation: 0 })
  })
})

describe('tipo de parede nas ferramentas', () => {
  afterEach(() => ed().setWallKind('masonry'))

  it('a ferramenta Parede desenha no tipo escolhido, com a espessura dele', () => {
    doc().update('sala', (d) => void drawRectRoom(d, { x: 0, y: 0 }, { x: 400, y: 300 }))
    ed().setWallKind('panel')
    ed().setTool('wall')
    click('wall', 100, 20)
    click('wall', 300, 20)
    key('wall', 'Escape')
    const panel = Object.values(doc().project.walls).find((w) => w.kind === 'panel')!
    expect(panel).toMatchObject({ kind: 'panel', thickness: 4.5, height: 280 })
    // a sala continua um cômodo só
    expect(quantities(doc().project).rooms).toHaveLength(1)
  })

  it('o Cômodo retangular em divisória cria divisórias', () => {
    ed().setWallKind('partition')
    ed().setTool('room')
    drag('room', [0, 0], [300, 200])
    const walls = Object.values(doc().project.walls)
    expect(walls).toHaveLength(4)
    expect(walls.every((w) => w.kind === 'partition' && w.thickness === 9.5)).toBe(true)
  })
})
