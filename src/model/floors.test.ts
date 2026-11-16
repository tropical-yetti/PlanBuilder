import { produce } from 'immer'
import { describe, expect, it } from 'vitest'
import { FLOORS, getFloor, searchFloors, wasteOf } from '../library/floors'
import { parseProjectData } from '../persistence/schema'
import { areasAsTsv } from '../app/areasTable'
import { floorTile, jointColor, shadeColor, type PieceRect } from './floorPattern'
import { setRoomFloor, specFromDef, updateRoomFloor } from './floors'
import { quantities } from './quantities'
import { emptyProject } from './testUtils'
import type { FloorPattern } from './types'
import { drawRectRoom, drawWallSegment } from './walls'

/** Parte da peça dentro do ladrilho. */
function clip(r: PieceRect, w: number, h: number) {
  const x0 = Math.max(0, r.x)
  const y0 = Math.max(0, r.y)
  const x1 = Math.min(w, r.x + r.w)
  const y1 = Math.min(h, r.y + r.h)
  return x1 > x0 && y1 > y0 ? { x0, y0, x1, y1 } : null
}

describe('paginações', () => {
  const patterns: FloorPattern[] = ['grid', 'stagger', 'diagonal', 'herringbone', 'basket']

  it.each(patterns)('%s: sem junta, as peças cobrem o ladrilho sem sobrepor', (pattern) => {
    const t = floorTile({ pattern, width: 7, length: 35, joint: 0, rotation: 0 })
    const parts = t.pieces.map((r) => clip(r, t.w, t.h)).filter((c) => c !== null)
    const area = parts.reduce((s, c) => s + (c.x1 - c.x0) * (c.y1 - c.y0), 0)
    expect(area).toBeCloseTo(t.w * t.h, 6)
    for (let i = 0; i < parts.length; i++) {
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i]!
        const b = parts[j]!
        const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
        const oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
        expect(ox > 1e-9 && oy > 1e-9, `${pattern}: peças ${i} e ${j} se sobrepõem`).toBe(false)
      }
    }
  })

  it('junta: as peças encolhem e sobra o rejunte', () => {
    const t = floorTile({ pattern: 'grid', width: 60, length: 60, joint: 0.5, rotation: 0 })
    expect(t.w).toBeCloseTo(121)
    expect(t.pieces[0]).toMatchObject({ x: 0.25, y: 0.25, w: 60, h: 60 })
  })

  it('giro: diagonal e espinha de peixe ficam a 45°, somando a direção escolhida', () => {
    expect(floorTile({ pattern: 'grid', width: 20, length: 120, joint: 0, rotation: 90 }).angle).toBe(90)
    expect(floorTile({ pattern: 'diagonal', width: 45, length: 45, joint: 0, rotation: 0 }).angle).toBe(45)
    expect(floorTile({ pattern: 'herringbone', width: 7, length: 35, joint: 0, rotation: 90 }).angle).toBe(135)
  })

  it('o tom das peças é estável', () => {
    const a = floorTile({ pattern: 'stagger', width: 18, length: 120, joint: 0, rotation: 0 })
    const b = floorTile({ pattern: 'stagger', width: 18, length: 120, joint: 0, rotation: 0 })
    expect(a.pieces.map((r) => r.shade)).toEqual(b.pieces.map((r) => r.shade))
    expect(a.pieces.every((r) => r.shade >= -1 && r.shade <= 1)).toBe(true)
  })

  it('cores', () => {
    expect(shadeColor('#808080', 0)).toBe('#808080')
    expect(shadeColor('#808080', 1)).toBe('#ffffff')
    expect(shadeColor('#808080', -1)).toBe('#000000')
    expect(jointColor('#f2f0ec')).not.toBe('#f2f0ec')
  })
})

describe('biblioteca de pisos', () => {
  it('tem parquet, vinílico e cerâmica, com padrões coerentes', () => {
    const materials = new Set(FLOORS.map((f) => f.material))
    expect([...materials].sort()).toEqual(['ceramic', 'vinyl', 'wood'])
    expect(new Set(FLOORS.map((f) => f.id)).size).toBe(FLOORS.length)
    for (const f of FLOORS) {
      expect(f.patterns, f.id).toContain(f.defaults.pattern)
      expect(f.colors.some((c) => c.value === f.defaults.color), f.id).toBe(true)
      expect(f.sizes.some((s) => s.width === f.defaults.width && s.length === f.defaults.length), f.id).toBe(true)
    }
  })

  it('busca sem acento e piso desconhecido', () => {
    expect(searchFloors('vinilico').map((f) => f.id)).toEqual(['floor.vinyl-planks', 'floor.vinyl-tiles'])
    expect(searchFloors('parquet').length).toBeGreaterThan(0)
    expect(getFloor('nao-existe').name).toBe('Piso desconhecido')
  })

  it('perda: 15% na diagonal e na espinha de peixe, 10% nas demais', () => {
    expect(wasteOf('diagonal')).toBe(0.15)
    expect(wasteOf('herringbone')).toBe(0.15)
    expect(wasteOf('grid')).toBe(0.1)
  })
})

describe('piso dos cômodos', () => {
  function twoRooms() {
    const p = emptyProject()
    drawRectRoom(p, { x: 0, y: 0 }, { x: 830, y: 415 })
    drawWallSegment(p, { x: 415, y: 0 }, { x: 415, y: 415 })
    return p
  }

  it('aplica, troca e remove', () => {
    let p = twoRooms()
    const [a, b] = quantities(p).rooms
    p = produce(p, (d) => setRoomFloor(d, a!, specFromDef(getFloor('floor.porcelain-60'))))
    let rooms = quantities(p).rooms
    expect(rooms[0]!.floor?.componentId).toBe('floor.porcelain-60')
    expect(rooms[1]!.floor).toBeNull()

    p = produce(p, (d) => setRoomFloor(d, rooms[0]!, specFromDef(getFloor('floor.vinyl-planks'))))
    expect(Object.keys(p.floors)).toHaveLength(1)
    rooms = quantities(p).rooms
    expect(rooms[0]!.floor?.componentId).toBe('floor.vinyl-planks')

    p = produce(p, (d) => setRoomFloor(d, b!, specFromDef(getFloor('floor.vinyl-planks'))))
    p = produce(p, (d) => setRoomFloor(d, quantities(p).rooms[0]!, null))
    rooms = quantities(p).rooms
    expect(rooms[0]!.floor).toBeNull()
    expect(rooms[1]!.floor?.componentId).toBe('floor.vinyl-planks')
  })

  it('ajusta campos e corrige paginação que o piso não oferece', () => {
    let p = twoRooms()
    const room = quantities(p).rooms[0]!
    p = produce(p, (d) => setRoomFloor(d, room, specFromDef(getFloor('floor.porcelain-60'))))
    p = produce(p, (d) => updateRoomFloor(d, room, { width: 60, length: 120, color: '#6b6f75' }))
    expect(Object.values(p.floors)[0]).toMatchObject({ width: 60, length: 120, color: '#6b6f75', pattern: 'grid' })
    p = produce(p, (d) => updateRoomFloor(d, room, { pattern: 'herringbone' }))
    expect(Object.values(p.floors)[0]!.pattern).toBe('grid')
  })

  it('quantitativo: área por piso, perda e peças', () => {
    let p = twoRooms()
    const [a, b] = quantities(p).rooms
    // 4 × 4 m cada cômodo por dentro (paredes de 15 cm)
    expect(a!.area).toBeCloseTo(160000)
    p = produce(p, (d) => setRoomFloor(d, a!, specFromDef(getFloor('floor.porcelain-60'))))
    p = produce(p, (d) => setRoomFloor(d, b!, specFromDef(getFloor('floor.porcelain-60'))))
    const [s] = quantities(p).floors
    expect(quantities(p).floors).toHaveLength(1)
    expect(s!.area).toBeCloseTo(320000)
    expect(s!.areaWithWaste).toBeCloseTo(352000)
    expect(s!.pieces).toBe(Math.ceil(352000 / 3600))
    expect(s!.rooms).toEqual(['Cômodo 1', 'Cômodo 2'])

    const tsv = areasAsTsv(quantities(p))
    expect(tsv).toContain('Cômodo 1\t16,00\t16,00\t')
    expect(tsv).toContain('Porcelanato 60 × 60\t60 × 60\tReta\t32,00\t10%\t35,20\t98\tCômodo 1, Cômodo 2')
  })

  it('o arquivo guarda o piso e descarta pisos quebrados', () => {
    let p = twoRooms()
    p = produce(p, (d) => setRoomFloor(d, quantities(p).rooms[0]!, specFromDef(getFloor('floor.taco-herringbone'))))
    const id = Object.keys(p.floors)[0]!
    const raw = JSON.parse(JSON.stringify(p)) as Record<string, Record<string, Record<string, unknown>>>
    raw.floors!.bad = { id: 'bad', x: 1, y: 1, componentId: 'x', pattern: 'zigzag', width: 1, length: 1, color: '#000000' }
    const r = parseProjectData(raw)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.project.floors)).toEqual([id])
    expect(r.project.floors[id]).toEqual(p.floors[id])
    // Projetos antigos, sem pisos, abrem normalmente.
    delete raw.floors
    const old = parseProjectData(raw)
    expect(old.ok && old.project.floors).toEqual({})
  })
})
