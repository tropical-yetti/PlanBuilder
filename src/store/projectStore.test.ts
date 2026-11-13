import { beforeEach, describe, expect, it } from 'vitest'
import { createEmptyProject } from '../model/project'
import { HISTORY_LIMIT, selectCanRedo, selectCanUndo, useProjectStore } from './projectStore'

const store = () => useProjectStore.getState()

function addNode(id: string, x = 0, y = 0) {
  store().update(`Nó ${id}`, (d) => {
    d.nodes[id] = { id, x, y }
  })
}

beforeEach(() => {
  store().load(createEmptyProject('Teste'))
})

describe('projectStore', () => {
  it('registra cada alteração como um passo', () => {
    addNode('a')
    addNode('b')
    expect(Object.keys(store().project.nodes)).toEqual(['a', 'b'])
    expect(store().past.map((e) => e.label)).toEqual(['Nó a', 'Nó b'])
  })

  it('desfaz e refaz', () => {
    addNode('a')
    addNode('b')
    store().undo()
    expect(Object.keys(store().project.nodes)).toEqual(['a'])
    expect(selectCanRedo(store())).toBe(true)
    store().undo()
    expect(store().project.nodes).toEqual({})
    expect(selectCanUndo(store())).toBe(false)
    store().redo()
    store().redo()
    expect(Object.keys(store().project.nodes)).toEqual(['a', 'b'])
    expect(selectCanRedo(store())).toBe(false)
  })

  it('uma alteração nova descarta o que podia ser refeito', () => {
    addNode('a')
    store().undo()
    addNode('c')
    expect(selectCanRedo(store())).toBe(false)
    expect(Object.keys(store().project.nodes)).toEqual(['c'])
  })

  it('ignora alterações que não mudam nada', () => {
    const rev = store().revision
    store().update('Nada', () => {})
    expect(store().past).toHaveLength(0)
    expect(store().revision).toBe(rev)
  })

  it('agrupa uma transação (ex.: arraste) em um único passo', () => {
    addNode('a', 0, 0)
    store().begin('Mover nó')
    for (let x = 1; x <= 50; x++) {
      store().update('Mover', (d) => {
        d.nodes.a!.x = x
      })
    }
    store().commit()
    expect(store().past.map((e) => e.label)).toEqual(['Nó a', 'Mover nó'])
    expect(store().project.nodes.a!.x).toBe(50)
    store().undo()
    expect(store().project.nodes.a!.x).toBe(0)
    store().redo()
    expect(store().project.nodes.a!.x).toBe(50)
  })

  it('cancelar a transação volta ao estado anterior sem criar passo', () => {
    addNode('a', 0, 0)
    store().begin('Mover nó')
    store().update('Mover', (d) => {
      d.nodes.a!.x = 10
    })
    store().update('Mover', (d) => {
      d.nodes.a!.y = 20
    })
    store().cancel()
    expect(store().project.nodes.a).toEqual({ id: 'a', x: 0, y: 0 })
    expect(store().past).toHaveLength(1)
  })

  it('desfazer durante uma transação fecha a transação e a desfaz', () => {
    addNode('a', 0, 0)
    store().begin('Mover nó')
    store().update('Mover', (d) => {
      d.nodes.a!.x = 10
    })
    expect(selectCanUndo(store())).toBe(true)
    store().undo()
    expect(store().pending).toBeNull()
    expect(store().project.nodes.a!.x).toBe(0)
  })

  it('transação vazia não cria passo', () => {
    store().begin('Nada')
    store().commit()
    expect(store().past).toHaveLength(0)
  })

  it(`guarda no máximo ${HISTORY_LIMIT} passos`, () => {
    for (let i = 0; i < HISTORY_LIMIT + 20; i++) addNode(`n${i}`)
    expect(store().past).toHaveLength(HISTORY_LIMIT)
    expect(store().past[0]!.label).toBe('Nó n20')
  })

  it('carregar um projeto limpa o histórico', () => {
    addNode('a')
    store().load(createEmptyProject('Outro'))
    expect(store().past).toHaveLength(0)
    expect(store().future).toHaveLength(0)
    expect(store().project.name).toBe('Outro')
  })

  it('incrementa a revisão a cada mudança, inclusive desfazer', () => {
    const r0 = store().revision
    addNode('a')
    store().undo()
    store().redo()
    expect(store().revision).toBe(r0 + 3)
  })
})
