import { describe, expect, it } from 'vitest'
import { counts, emptyProject, segments } from './testUtils'
import type { Project } from './types'
import {
  canMergeWalls,
  connectMovedNodes,
  deleteNode,
  deleteWall,
  drawRectRoom,
  drawWallSegment,
  findNodeAt,
  mergeWalls,
  nodePos,
  parallelMovePositions,
  collinearRun,
  runMovePositions,
  setNodePositions,
  setWallLengthPositions,
  splitWall,
  wallsAtNode,
} from './walls'

const P = (x: number, y: number) => ({ x, y })

function addOpening(p: Project, wallId: string, offset: number) {
  const id = `o${Object.keys(p.openings).length}`
  p.openings[id] = { id, wallId, componentId: 'door.swing-single', offset, width: 80, height: 210, sillHeight: 0, flipSide: false, flipHinge: false, params: {} }
  return id
}

describe('drawWallSegment', () => {
  it('cria dois nós e uma parede com as medidas padrão', () => {
    const p = emptyProject()
    const r = drawWallSegment(p, P(0, 0), P(400, 0))
    expect(counts(p)).toEqual({ nodes: 2, walls: 1 })
    const w = p.walls[r.wallIds[0]!]!
    expect(w.thickness).toBe(15)
    expect(w.height).toBe(280)
  })

  it('reaproveita o nó existente na ponta', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(400, 0), P(400, 300))
    expect(counts(p)).toEqual({ nodes: 3, walls: 2 })
  })

  it('divide a parede quando a nova parede começa no meio dela (T)', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(200, 0), P(200, 300))
    expect(segments(p)).toEqual(['0,0-200,0', '200,0-200,300', '200,0-400,0'])
  })

  it('cria nó no cruzamento de duas paredes (X)', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 100), P(400, 100))
    drawWallSegment(p, P(200, 0), P(200, 300))
    expect(counts(p)).toEqual({ nodes: 5, walls: 4 })
    const center = findNodeAt(p, P(200, 100))!
    expect(wallsAtNode(p, center)).toHaveLength(4)
  })

  it('não duplica parede desenhada por cima de outra', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(400, 0), P(0, 0))
    expect(counts(p)).toEqual({ nodes: 2, walls: 1 })
  })

  it('parede sobreposta em parte reaproveita o trecho comum', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(200, 0), P(600, 0))
    expect(segments(p)).toEqual(['0,0-200,0', '200,0-400,0', '400,0-600,0'])
  })

  it('ignora segmento de comprimento zero', () => {
    const p = emptyProject()
    const r = drawWallSegment(p, P(10, 10), P(10.2, 10))
    expect(r.wallIds).toEqual([])
    expect(counts(p).walls).toBe(0)
  })
})

describe('drawRectRoom', () => {
  it('cria 4 paredes e 4 cantos fechados', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    expect(counts(p)).toEqual({ nodes: 4, walls: 4 })
    for (const n of Object.keys(p.nodes)) expect(wallsAtNode(p, n)).toHaveLength(2)
  })

  it('cômodo encostado em outro compartilha a parede', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawRectRoom(p, P(400, 0), P(700, 300))
    expect(counts(p)).toEqual({ nodes: 6, walls: 7 })
  })
})

describe('splitWall', () => {
  it('passa as aberturas para o trecho onde está o centro delas', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    addOpening(p, w!, 100)
    const o2 = addOpening(p, w!, 300)
    splitWall(p, w!, P(200, 0))
    expect(p.openings.o0!.wallId).toBe(w)
    expect(p.openings.o0!.offset).toBeCloseTo(100)
    expect(p.openings[o2]!.wallId).not.toBe(w)
    expect(p.openings[o2]!.offset).toBeCloseTo(100)
  })

  it('ponto colado na ponta retorna o nó da ponta', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    expect(splitWall(p, w!, P(0.2, 0))).toBe(p.walls[w!]!.a)
    expect(counts(p).walls).toBe(1)
  })
})

describe('exclusão', () => {
  it('excluir parede remove aberturas e nós órfãos', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    drawWallSegment(p, P(400, 0), P(400, 300))
    addOpening(p, w!, 200)
    deleteWall(p, w!)
    expect(counts(p)).toEqual({ nodes: 2, walls: 1 })
    expect(p.openings).toEqual({})
  })

  it('excluir nó entre paredes alinhadas as une', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(200, 0))
    drawWallSegment(p, P(200, 0), P(400, 0))
    deleteNode(p, findNodeAt(p, P(200, 0))!)
    expect(segments(p)).toEqual(['0,0-400,0'])
  })

  it('excluir nó de canto remove as paredes ligadas', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    deleteNode(p, findNodeAt(p, P(0, 0))!)
    expect(counts(p)).toEqual({ nodes: 3, walls: 2 })
  })
})

describe('unir paredes', () => {
  it('une duas paredes alinhadas mantendo as aberturas no lugar', () => {
    const p = emptyProject()
    const [w1] = drawWallSegment(p, P(0, 0), P(200, 0)).wallIds
    const [w2] = drawWallSegment(p, P(200, 0), P(400, 0)).wallIds
    addOpening(p, w2!, 100) // centro em x = 300
    expect(canMergeWalls(p, w1!, w2!)).toBe(true)
    const merged = mergeWalls(p, w1!, w2!)!
    expect(segments(p)).toEqual(['0,0-400,0'])
    expect(p.openings.o0!.wallId).toBe(merged)
    expect(p.openings.o0!.offset).toBeCloseTo(300)
  })

  it('não une paredes em ângulo nem com uma terceira parede no nó', () => {
    const p = emptyProject()
    const [w1] = drawWallSegment(p, P(0, 0), P(200, 0)).wallIds
    const [w2] = drawWallSegment(p, P(200, 0), P(200, 200)).wallIds
    expect(canMergeWalls(p, w1!, w2!)).toBe(false)

    const q = emptyProject()
    const [a] = drawWallSegment(q, P(0, 0), P(200, 0)).wallIds
    const [b] = drawWallSegment(q, P(200, 0), P(400, 0)).wallIds
    drawWallSegment(q, P(200, 0), P(200, 100))
    expect(canMergeWalls(q, a!, b!)).toBe(false)
  })
})

describe('mover', () => {
  it('mover parede em paralelo estica as vizinhas mantendo a direção', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    const top = Object.values(p.walls).find((w) => nodePos(p, w.a).y === 0 && nodePos(p, w.b).y === 0)!
    // Normal esquerda da parede de cima depende da direção; move 50 cm para fora (y negativo).
    const a = nodePos(p, top.a)
    const b = nodePos(p, top.b)
    const sign = b.x > a.x ? -1 : 1 // perp((1,0)) = (0,1): para y negativo a distância é -50
    setNodePositions(p, parallelMovePositions(p, top.id, 50 * sign))
    expect(segments(p)).toEqual(['0,-50-0,300', '0,-50-400,-50', '0,300-400,300', '400,-50-400,300'])
  })

  it('parede sem vizinhas apenas se desloca', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    setNodePositions(p, parallelMovePositions(p, w!, 30))
    expect(segments(p)).toEqual(['0,30-400,30'])
  })

  it('muda o comprimento mantendo a ponta escolhida', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    setNodePositions(p, setWallLengthPositions(p, w!, 300, 'start'))
    expect(segments(p)).toEqual(['0,0-300,0'])
    setNodePositions(p, setWallLengthPositions(p, w!, 500, 'end'))
    expect(segments(p)).toEqual(['-200,0-300,0'])
    setNodePositions(p, setWallLengthPositions(p, w!, 100, 'center'))
    expect(segments(p)).toEqual(['0,0-100,0'])
  })

  it('canto solto sobre outro canto é fundido', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(0, 100), P(400, 100))
    const n = findNodeAt(p, P(400, 100))!
    setNodePositions(p, { [n]: P(400, 0) })
    connectMovedNodes(p, [n])
    expect(counts(p)).toEqual({ nodes: 3, walls: 2 })
    expect(wallsAtNode(p, findNodeAt(p, P(400, 0))!)).toHaveLength(2)
  })

  it('canto solto sobre o meio de uma parede a divide', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    drawWallSegment(p, P(200, 100), P(200, 300))
    const n = findNodeAt(p, P(200, 100))!
    setNodePositions(p, { [n]: P(200, 0.3) })
    connectMovedNodes(p, [n])
    expect(segments(p)).toEqual(['0,0-200,0', '200,0-200,300', '200,0-400,0'])
  })

  it('fundir as duas pontas de uma parede remove a parede', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(100, 0))
    drawWallSegment(p, P(100, 0), P(100, 100))
    const n = findNodeAt(p, P(100, 0))!
    setNodePositions(p, { [n]: P(0, 0) })
    connectMovedNodes(p, [n])
    expect(segments(p)).toEqual(['0,0-100,100'])
  })
})

describe('mover a linha reta inteira', () => {
  it('encontra os trechos alinhados e ignora as paredes que chegam em T', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(250, 0), P(250, 300))
    const [w] = Object.values(p.walls).filter((x) => nodePos(p, x.a).y === 0 && nodePos(p, x.b).y === 0)
    expect(collinearRun(p, w!.id)).toHaveLength(2)
  })

  it('paredes que chegam inclinadas esticam na própria direção (o ângulo não muda)', () => {
    const p = emptyProject()
    const [top] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    drawWallSegment(p, P(0, 0), P(-100, 200)) // inclinada para a esquerda
    drawWallSegment(p, P(400, 0), P(400, 200))
    const sign = nodePos(p, p.walls[top!]!.b).x > nodePos(p, p.walls[top!]!.a).x ? 1 : -1
    setNodePositions(p, runMovePositions(p, top!, 100 * sign)) // desce 100 cm
    // a inclinada continua na mesma reta: de (0,0) para (−100,200) passa por (−50,100)
    expect(segments(p)).toEqual(['-100,200--50,100', '-50,100-400,100', '400,100-400,200'])
  })
})
