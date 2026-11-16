/**
 * Formato do arquivo de projeto, validação e migrações (docs/PLANO.md, seção 8).
 *
 * Todo arquivo traz `schemaVersion`. Quando o formato mudar, a versão sobe e entra aqui uma função
 * que converte a versão anterior na nova: assim, arquivos antigos continuam abrindo.
 */
import { DEFAULT_SETTINGS, newId } from '../model/project'
import { SCHEMA_VERSION, type Project, type RoomFloor } from '../model/types'

export const FILE_EXTENSION = '.planbuilder.json'

export interface ProjectFile {
  app: 'planbuilder'
  schemaVersion: number
  savedAt: string
  project: Project
}

export type ParseResult =
  | { ok: true; project: Project; /** Problemas corrigidos ao abrir (ex.: objetos inválidos descartados). */ warnings: string[] }
  | { ok: false; error: string }

type Raw = Record<string, unknown>
const isObject = (x: unknown): x is Raw => !!x && typeof x === 'object' && !Array.isArray(x)
const num = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x)
const str = (x: unknown): x is string => typeof x === 'string'

/**
 * Migrações por versão de origem: `MIGRATIONS[n]` converte um projeto da versão n para n + 1.
 * (Vazio enquanto só existe a versão 1.)
 */
const MIGRATIONS: Record<number, (p: Raw) => Raw> = {}

function records(x: unknown): Raw[] {
  return isObject(x) ? Object.values(x).filter(isObject) : []
}

/** Monta um projeto válido a partir de dados já na versão atual, descartando o que estiver quebrado. */
function sanitize(raw: Raw): { project: Project; warnings: string[] } {
  const warnings: string[] = []
  const dropped = (n: number, one: string, many: string) => {
    if (n > 0) warnings.push(`${n} ${n === 1 ? one : many}`)
  }
  const now = new Date().toISOString()
  const settings = isObject(raw.settings) ? raw.settings : {}
  const project: Project = {
    schemaVersion: SCHEMA_VERSION,
    id: str(raw.id) ? raw.id : newId(),
    name: str(raw.name) && raw.name.trim() !== '' ? raw.name : 'Projeto sem título',
    createdAt: str(raw.createdAt) ? raw.createdAt : now,
    updatedAt: str(raw.updatedAt) ? raw.updatedAt : now,
    settings: {
      gridSize: num(settings.gridSize) && settings.gridSize > 0 ? settings.gridSize : DEFAULT_SETTINGS.gridSize,
      defaultWallThickness: num(settings.defaultWallThickness) && settings.defaultWallThickness > 0 ? settings.defaultWallThickness : DEFAULT_SETTINGS.defaultWallThickness,
      defaultWallHeight: num(settings.defaultWallHeight) && settings.defaultWallHeight > 0 ? settings.defaultWallHeight : DEFAULT_SETTINGS.defaultWallHeight,
      ...(num(settings.partitionThickness) && settings.partitionThickness > 0 ? { partitionThickness: settings.partitionThickness } : {}),
      ...(num(settings.panelThickness) && settings.panelThickness > 0 ? { panelThickness: settings.panelThickness } : {}),
    },
    nodes: {},
    walls: {},
    openings: {},
    items: {},
    dimensions: {},
    texts: {},
    roomLabels: {},
    floors: {},
  }

  for (const n of records(raw.nodes)) {
    if (str(n.id) && num(n.x) && num(n.y)) project.nodes[n.id] = { id: n.id, x: n.x, y: n.y }
  }

  let bad = 0
  const seen = new Set<string>()
  for (const w of records(raw.walls)) {
    const pair = str(w.a) && str(w.b) ? [w.a, w.b].sort().join('|') : ''
    const valid =
      str(w.id) && str(w.a) && str(w.b) && w.a !== w.b && !!project.nodes[w.a] && !!project.nodes[w.b] && num(w.thickness) && w.thickness > 0 && num(w.height) && w.height > 0 && !seen.has(pair)
    if (!valid) {
      bad += 1
      continue
    }
    seen.add(pair)
    project.walls[w.id as string] = {
      id: w.id as string,
      a: w.a as string,
      b: w.b as string,
      thickness: w.thickness as number,
      height: w.height as number,
      // tipo desconhecido (de uma versão futura) é tratado como alvenaria
      ...(w.kind === 'partition' || w.kind === 'panel' ? { kind: w.kind } : {}),
      ...(w.locked === true ? { locked: true } : {}),
    }
  }
  dropped(bad, 'parede inválida foi descartada', 'paredes inválidas foram descartadas')

  // Nós que não pertencem a nenhuma parede não têm função.
  const used = new Set(Object.values(project.walls).flatMap((w) => [w.a, w.b]))
  for (const id of Object.keys(project.nodes)) if (!used.has(id)) delete project.nodes[id]

  bad = 0
  for (const o of records(raw.openings)) {
    const valid = str(o.id) && str(o.wallId) && !!project.walls[o.wallId] && str(o.componentId) && num(o.offset) && num(o.width) && o.width > 0 && num(o.height) && o.height > 0
    if (!valid) {
      bad += 1
      continue
    }
    project.openings[o.id as string] = {
      id: o.id as string,
      wallId: o.wallId as string,
      componentId: o.componentId as string,
      offset: o.offset as number,
      width: o.width as number,
      height: o.height as number,
      sillHeight: num(o.sillHeight) ? o.sillHeight : 0,
      flipSide: o.flipSide === true,
      flipHinge: o.flipHinge === true,
      params: isObject(o.params) ? { ...o.params } : {},
      ...(o.locked === true ? { locked: true } : {}),
    }
  }
  dropped(bad, 'porta ou janela inválida foi descartada', 'portas ou janelas inválidas foram descartadas')

  const point = (x: unknown) => (isObject(x) && num(x.x) && num(x.y) ? { x: x.x, y: x.y } : null)
  bad = 0
  for (const d of records(raw.dimensions)) {
    const p1 = point(d.p1)
    const p2 = point(d.p2)
    if (!str(d.id) || !p1 || !p2) {
      bad += 1
      continue
    }
    project.dimensions[d.id] = { id: d.id, p1, p2, offset: num(d.offset) ? d.offset : 30, ...(d.locked === true ? { locked: true } : {}) }
  }
  for (const t of records(raw.texts)) {
    if (!str(t.id) || !num(t.x) || !num(t.y) || !str(t.text) || t.text.trim() === '') {
      bad += 1
      continue
    }
    project.texts[t.id] = {
      id: t.id,
      x: t.x,
      y: t.y,
      text: t.text,
      size: num(t.size) && t.size > 0 ? t.size : 20,
      rotation: num(t.rotation) ? t.rotation : 0,
      ...(t.locked === true ? { locked: true } : {}),
    }
  }
  dropped(bad, 'anotação inválida foi descartada', 'anotações inválidas foram descartadas')

  bad = 0
  for (const it of records(raw.items)) {
    const valid =
      str(it.id) && str(it.componentId) && num(it.x) && num(it.y) && num(it.width) && it.width > 0 && num(it.depth) && it.depth > 0 && num(it.height) && it.height > 0
    if (!valid) {
      bad += 1
      continue
    }
    project.items[it.id as string] = {
      id: it.id as string,
      componentId: it.componentId as string,
      x: it.x as number,
      y: it.y as number,
      rotation: num(it.rotation) ? ((it.rotation % 360) + 360) % 360 : 0,
      width: it.width as number,
      depth: it.depth as number,
      height: it.height as number,
      mirrored: it.mirrored === true,
      params: isObject(it.params) ? { ...it.params } : {},
      ...(it.locked === true ? { locked: true } : {}),
    }
  }
  dropped(bad, 'móvel inválido foi descartado', 'móveis inválidos foram descartados')

  for (const l of records(raw.roomLabels)) {
    if (str(l.id) && num(l.x) && num(l.y) && str(l.name)) project.roomLabels[l.id] = { id: l.id, x: l.x, y: l.y, name: l.name }
  }

  const patterns = new Set(['grid', 'stagger', 'diagonal', 'herringbone', 'basket'])
  for (const fl of records(raw.floors)) {
    const ok =
      str(fl.id) && num(fl.x) && num(fl.y) && str(fl.componentId) && str(fl.pattern) && patterns.has(fl.pattern) &&
      num(fl.width) && fl.width > 0 && num(fl.length) && fl.length > 0 && str(fl.color) && /^#[0-9a-f]{6}$/i.test(fl.color)
    if (!ok) continue
    project.floors[fl.id as string] = {
      id: fl.id as string,
      x: fl.x as number,
      y: fl.y as number,
      componentId: fl.componentId as string,
      pattern: fl.pattern as RoomFloor['pattern'],
      width: fl.width as number,
      length: fl.length as number,
      joint: num(fl.joint) && fl.joint >= 0 ? fl.joint : 0,
      color: fl.color as string,
      rotation: num(fl.rotation) ? ((fl.rotation % 180) + 180) % 180 : 0,
    }
  }
  return { project, warnings }
}

/** Converte dados lidos (arquivo ou salvamento automático) em um projeto válido na versão atual. */
export function parseProjectData(data: unknown): ParseResult {
  if (!isObject(data)) return { ok: false, error: 'O arquivo não é um projeto do PlanBuilder.' }
  // Aceita o arquivo completo ({ app, project }) ou só o projeto.
  let raw = isObject(data.project) ? data.project : data
  const version = raw.schemaVersion
  if (!num(version) || !Number.isInteger(version) || version < 1 || !isObject(raw.walls) || !isObject(raw.nodes)) {
    return { ok: false, error: 'O arquivo não é um projeto do PlanBuilder.' }
  }
  if (version > SCHEMA_VERSION) {
    return { ok: false, error: 'Este projeto foi salvo por uma versão mais nova do PlanBuilder. Atualize o app para abri-lo.' }
  }
  for (let v = version; v < SCHEMA_VERSION; v++) {
    const step = MIGRATIONS[v]
    if (!step) return { ok: false, error: `Não foi possível converter o projeto da versão ${v}.` }
    raw = step(raw)
  }
  return { ok: true, ...sanitize(raw) }
}

export function parseProjectText(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'O arquivo está corrompido ou não é um projeto do PlanBuilder.' }
  }
  return parseProjectData(data)
}

export function serializeProject(project: Project, now = new Date()): string {
  const file: ProjectFile = {
    app: 'planbuilder',
    schemaVersion: SCHEMA_VERSION,
    savedAt: now.toISOString(),
    project: { ...project, updatedAt: now.toISOString() },
  }
  return JSON.stringify(file, null, 2)
}

/** Nome de arquivo seguro a partir do nome do projeto. */
export function fileNameFor(projectName: string, extension = FILE_EXTENSION): string {
  const base = [...projectName.normalize('NFC')]
    // caracteres proibidos em nomes de arquivo e caracteres de controle viram espaço
    .map((ch) => ('\\/:*?"<>|'.includes(ch) || ch.charCodeAt(0) < 32 ? ' ' : ch))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+/, '')
    .slice(0, 80)
  return `${base || 'projeto'}${extension}`
}
