import { describe, expect, it } from 'vitest'
import { addDimension, addText } from './annotations'
import { addOpening } from './openings'
import { allSelectable, setLocked, similarTo } from './selection'
import { counts, emptyProject, segments } from './testUtils'
import {
  alignSelection,
  copySelection,
  copyStyle,
  distributeSelection,
  mirrorSelection,
  nudgeOpenings,
  parseClip,
  pasteClip,
  pasteStyle,
  rotateSelection,
  scaleSelection,
  translateSelection,
} from './transforms'
import type { Project } from './types'
import { drawRectRoom, drawWallSegment } from './walls'

const P = (x: number, y: number) => ({ x, y })
const wallIds = (p: Project) => Object.keys(p.walls)
const door = (p: Project, wallId: string, offset: number) =>
  addOpening(p, { wallId, componentId: 'door.swing-single', offset, width: 80, height: 210, sillHeight: 0, flipSide: false, flipHinge: false, params: {} })!

describe('mover, girar, espelhar', () => {
  it('move paredes, textos e cotas juntos', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    const t = addText(p, P(100, 100), 'Sala')!
    const d = addDimension(p, P(0, 0), P(400, 0))!
    translateSelection(p, [...wallIds(p), t, d], P(50, -20))
    expect(segments(p)).toEqual(['450,-20-50,-20']) // pontas em ordem de texto
    expect(p.texts[t]).toMatchObject({ x: 150, y: 80 })
    expect(p.dimensions[d]).toMatchObject({ p1: P(50, -20), p2: P(450, -20) })
  })

  it('gira 90° em torno do centro, com medidas exatas', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 200))
    rotateSelection(p, wallIds(p), 90)
    expect(segments(p)).toEqual(['100,-100-100,300', '100,-100-300,-100', '100,300-300,300', '300,-100-300,300'])
    rotateSelection(p, wallIds(p), -90)
    expect(segments(p)).toEqual(['0,0-0,200', '0,0-400,0', '0,200-400,200', '400,0-400,200'])
  })

  it('espelhar inverte o lado das portas e mantém a posição espelhada', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    const o = door(p, w!, 100)
    mirrorSelection(p, [w!], 'horizontal')
    expect(segments(p)).toEqual(['0,0-400,0'])
    expect(p.openings[o]!.flipSide).toBe(true)
    // o centro estava em x = 100; espelhado em torno de x = 200 vai para x = 300
    const wall = p.walls[w!]!
    const ax = p.nodes[wall.a]!.x
    expect(ax === 400 ? 400 - p.openings[o]!.offset : p.openings[o]!.offset).toBe(300)
  })

  it('redimensiona pelo fator', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 200))
    scaleSelection(p, wallIds(p), 0.5)
    expect(segments(p)).toEqual(['100,150-100,50', '100,150-300,150', '100,50-300,50', '300,150-300,50'])
  })

  it('setas movem a abertura ao longo da parede, sem passar por cima de outra', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    const a = door(p, w!, 100)
    door(p, w!, 200)
    nudgeOpenings(p, [a], P(10, 0))
    expect(p.openings[a]!.offset).toBe(110)
    nudgeOpenings(p, [a], P(0, 10)) // perpendicular: não anda
    nudgeOpenings(p, [a], P(20, 0)) // bateria na outra porta
    expect(p.openings[a]!.offset).toBe(110)
  })

  it('objetos bloqueados não se movem', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    setLocked(p, [w!], true)
    translateSelection(p, [w!], P(50, 0))
    expect(segments(p)).toEqual(['0,0-400,0'])
    expect(allSelectable(p)).toEqual([])
  })
})

describe('alinhar e distribuir', () => {
  function threeTexts() {
    const p = emptyProject()
    const ids = [addText(p, P(0, 0), 'aa')!, addText(p, P(100, 50), 'aa')!, addText(p, P(500, 200), 'aa')!]
    return { p, ids }
  }

  it('alinha pela esquerda e pelo topo', () => {
    const { p, ids } = threeTexts()
    alignSelection(p, ids, 'left')
    expect(new Set(ids.map((id) => p.texts[id]!.x)).size).toBe(1)
    alignSelection(p, ids, 'top')
    expect(new Set(ids.map((id) => p.texts[id]!.y)).size).toBe(1)
  })

  it('distribui com espaços iguais', () => {
    const { p, ids } = threeTexts()
    distributeSelection(p, ids, 'x')
    expect(ids.map((id) => p.texts[id]!.x)).toEqual([0, 250, 500])
  })

  it('paredes ligadas andam como um bloco', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(100, 100))
    drawRectRoom(p, P(300, 50), P(400, 150))
    alignSelection(p, wallIds(p), 'top')
    expect(counts(p)).toEqual({ nodes: 8, walls: 8 })
    expect(Math.max(...Object.values(p.nodes).map((n) => n.y))).toBe(100)
  })
})

describe('copiar e colar', () => {
  it('cola paredes com suas portas, deslocadas', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    door(p, w!, 100)
    const clip = parseClip(JSON.stringify(copySelection(p, [w!])))!
    const ids = pasteClip(p, clip, P(0, 300))
    expect(segments(p)).toEqual(['0,0-400,0', '0,300-400,300'])
    expect(Object.keys(p.openings)).toHaveLength(2)
    expect(ids).toHaveLength(2)
  })

  it('paredes coladas se ligam às existentes', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0))
    const [v] = drawWallSegment(p, P(0, 0), P(0, 300)).wallIds
    pasteClip(p, copySelection(p, [v!])!, P(400, 0))
    expect(counts(p)).toEqual({ nodes: 4, walls: 3 })
  })

  it('porta copiada sozinha vai para a próxima posição livre da mesma parede', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    const o = door(p, w!, 100)
    const ids = pasteClip(p, copySelection(p, [o])!, P(20, 200))
    expect(ids).toHaveLength(1)
    expect(p.openings[ids[0]!]).toMatchObject({ wallId: w, offset: 190 })
  })

  it('porta copiada sozinha e colada sobre outra parede vai para ela', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(400, 0)).wallIds
    const [w2] = drawWallSegment(p, P(0, 300), P(400, 300)).wallIds
    const o = door(p, w!, 100)
    const ids = pasteClip(p, copySelection(p, [o])!, P(50, 290))
    expect(p.openings[ids[0]!]!.wallId).toBe(w2)
  })

  it('rejeita texto que não é do app', () => {
    expect(parseClip('olá')).toBeNull()
    expect(parseClip('{"app":"outro"}')).toBeNull()
  })

  it('copiar e colar propriedades', () => {
    const p = emptyProject()
    const [a] = drawWallSegment(p, P(0, 0), P(400, 0), { thickness: 25, height: 300 }).wallIds
    const [b] = drawWallSegment(p, P(0, 200), P(400, 200)).wallIds
    pasteStyle(p, [b!], copyStyle(p, [a!])!)
    expect(p.walls[b!]).toMatchObject({ thickness: 25, height: 300 })
  })

  it('selecionar semelhantes', () => {
    const p = emptyProject()
    const [a] = drawWallSegment(p, P(0, 0), P(400, 0), { thickness: 25, height: 280 }).wallIds
    drawWallSegment(p, P(0, 200), P(400, 200))
    drawWallSegment(p, P(0, 400), P(400, 400), { thickness: 25, height: 280 })
    expect(similarTo(p, a!)).toHaveLength(2)
  })
})
