import { describe, expect, it } from 'vitest'
import { parseProjectData } from '../persistence/schema'
import { polygonArea } from './geometry'
import { quantities } from './quantities'
import { wallPolygons } from './wallGeometry'
import { emptyProject } from './testUtils'
import { copySelection, pasteClip } from './transforms'
import { canMergeWalls, collinearRun, defaultThickness, defaultWallProps, drawRectRoom, drawWallSegment } from './walls'

const P = (x: number, y: number) => ({ x, y })
const H = 280

describe('tipos de parede', () => {
  it('painel de TV junto à parede: não cria cômodo e só a área dele sai da sala', () => {
    // Sala 4,00 × 3,00 (paredes de 15 cm, face interna da parede de cima em y = 7,5).
    // Painel de gesso de 4,5 cm, paralelo à parede de cima, com 10 cm de vão para os cabos.
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    const y = 7.5 + 10 + 2.25
    drawWallSegment(p, P(100, y), P(300, y), defaultWallProps(p, 'panel'))
    const q = quantities(p)
    expect(q.rooms).toHaveLength(1)
    // a sala perde só o piso que o painel ocupa (200 × 4,5); o vão de 10 cm continua sendo sala
    expect(q.rooms[0]!.area).toBeCloseTo(385 * 285 - 200 * 4.5)
    expect(q.panels).toEqual({ length: 200, area: 200 * H, count: 1 })
    // o painel não entra na superfície de pintura; as paredes da sala continuam iguais
    expect(q.wallSurface.internal).toBeCloseTo(2 * (385 + 285) * H)
  })

  it('painel que fecha um contorno com as paredes também não vira cômodo', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    // painel de ponta a ponta, encostando nas paredes laterais: antes formava uma faixa estreita
    drawWallSegment(p, P(0, 20), P(400, 20), defaultWallProps(p, 'panel'))
    const q = quantities(p)
    expect(q.rooms).toHaveLength(1)
    expect(q.rooms[0]!.area).toBeCloseTo(385 * 285 - 385 * 4.5)
  })

  it('a mesma linha em alvenaria divide a sala (comportamento de parede comum)', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(0, 150), P(400, 150))
    expect(quantities(p).rooms).toHaveLength(2)
  })

  it('divisória de drywall divide cômodos e entra na superfície e no próprio quantitativo', () => {
    const p = emptyProject()
    drawRectRoom(p, P(0, 0), P(400, 300))
    drawWallSegment(p, P(200, 0), P(200, 300), defaultWallProps(p, 'partition'))
    const q = quantities(p)
    expect(q.rooms).toHaveLength(2)
    expect(q.partitions.length).toBeCloseTo(300)
    expect(q.partitions.area).toBeCloseTo(300 * H)
    expect(q.panels.count).toBe(0)
  })

  it('espessura padrão por tipo, ajustável por projeto', () => {
    const p = emptyProject()
    expect([defaultThickness(p, 'masonry'), defaultThickness(p, 'partition'), defaultThickness(p, 'panel')]).toEqual([15, 9.5, 4.5])
    p.settings.panelThickness = 3
    expect(defaultWallProps(p, 'panel')).toEqual({ thickness: 3, height: 280, kind: 'panel' })
    // alvenaria não grava o campo (projetos antigos continuam iguais)
    expect(defaultWallProps(p)).toEqual({ thickness: 15, height: 280 })
  })

  it('painel e alvenaria alinhados não se fundem nem andam juntos na trava de direção', () => {
    const p = emptyProject()
    const [a] = drawWallSegment(p, P(0, 0), P(200, 0)).wallIds
    const [b] = drawWallSegment(p, P(200, 0), P(400, 0), defaultWallProps(p, 'panel')).wallIds
    expect(canMergeWalls(p, a!, b!)).toBe(false)
    expect(collinearRun(p, a!)).toEqual([a])
  })

  it('o tipo vai junto ao copiar e colar, e ao salvar e abrir', () => {
    const p = emptyProject()
    const [w] = drawWallSegment(p, P(0, 0), P(200, 0), defaultWallProps(p, 'panel')).wallIds
    const [pasted] = pasteClip(p, copySelection(p, [w!])!, P(0, 100))
    expect(p.walls[pasted!]).toMatchObject({ kind: 'panel', thickness: 4.5 })
    const r = parseProjectData(JSON.parse(JSON.stringify(p)))
    expect(r.ok && Object.values(r.project.walls).map((x) => x.kind)).toEqual(['panel', 'panel'])
    // tipo desconhecido (versão futura) vira alvenaria, sem quebrar
    const raw = JSON.parse(JSON.stringify(p))
    for (const x of Object.values(raw.walls) as { kind: string }[]) x.kind = 'vidro'
    const r2 = parseProjectData(raw)
    expect(r2.ok && Object.values(r2.project.walls).every((x) => x.kind === undefined)).toBe(true)
  })
})

describe('encontro de paredes de tipos diferentes', () => {
  it('a alvenaria segue contínua e a divisória termina na face dela', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(400, 0)) // alvenaria de 15 cm
    drawWallSegment(p, P(200, 0), P(200, 300), defaultWallProps(p, 'partition')) // divisória em T
    const polys = [...wallPolygons(p).values()]
    const partition = polys.find((x) => p.walls[x.wallId]!.kind === 'partition')!
    // nenhum ponto da divisória entra na alvenaria (y < 7,5)
    expect(Math.min(...partition.points.map((q) => q.y))).toBeCloseTo(7.5)
    // as duas metades da alvenaria cobrem a faixa inteira, sem buraco: 400 × 15
    const masonry = polys.filter((x) => !p.walls[x.wallId]!.kind)
    expect(masonry.reduce((s2, x) => s2 + polygonArea(x.points), 0)).toBeCloseTo(400 * 15)
    expect(polygonArea(partition.points)).toBeCloseTo(9.5 * (300 - 7.5))
  })

  it('o painel encostado na alvenaria também para na face', () => {
    const p = emptyProject()
    drawWallSegment(p, P(0, 0), P(0, 300))
    drawWallSegment(p, P(0, 100), P(150, 100), defaultWallProps(p, 'panel'))
    const panel = [...wallPolygons(p).values()].find((x) => p.walls[x.wallId]!.kind === 'panel')!
    expect(Math.min(...panel.points.map((q) => q.x))).toBeCloseTo(7.5)
  })
})
