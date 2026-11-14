/**
 * Modelo de dados do documento do projeto (ver docs/PLANO.md, seção 4).
 * Todas as medidas em centímetros. Este módulo não depende de React, Konva ou Three.
 */

export type Id = string

export interface Point {
  x: number
  y: number
}

export interface WallNode extends Point {
  id: Id
}

export interface Wall {
  id: Id
  /** Nó da ponta inicial. */
  a: Id
  /** Nó da ponta final. */
  b: Id
  thickness: number
  height: number
  locked?: boolean
}

export interface Opening {
  id: Id
  wallId: Id
  /** Id do componente na biblioteca, ex.: "door.swing-single". */
  componentId: string
  /** Distância do nó "a" da parede até o centro do vão. */
  offset: number
  width: number
  height: number
  /** Altura do peitoril (0 para portas). */
  sillHeight: number
  /** Abre para um lado ou outro da parede. */
  flipSide: boolean
  /** Dobradiça à esquerda ou à direita. */
  flipHinge: boolean
  params: Record<string, unknown>
  locked?: boolean
}

/** Móvel ou objeto solto no cômodo. */
export interface Item {
  id: Id
  /** Id do componente na biblioteca, ex.: "furniture.sofa-3". */
  componentId: string
  /** Centro, em cm. */
  x: number
  y: number
  /** Giro em graus (sentido horário na tela). 0 = fundo voltado para cima. */
  rotation: number
  width: number
  /** Profundidade (frente a fundo). */
  depth: number
  height: number
  /** Espelhado da esquerda para a direita. */
  mirrored: boolean
  params: Record<string, unknown>
  locked?: boolean
}

export interface Dimension {
  id: Id
  p1: Point
  p2: Point
  /** Afastamento da linha de cota em relação aos pontos medidos. */
  offset: number
  locked?: boolean
}

export interface TextNote {
  id: Id
  x: number
  y: number
  text: string
  size: number
  rotation: number
  locked?: boolean
}

export interface RoomLabel {
  id: Id
  /** Ponto dentro do cômodo: o cômodo que contém este ponto recebe o nome. */
  x: number
  y: number
  name: string
  labelOffset?: Point
}

export interface ProjectSettings {
  gridSize: number
  defaultWallThickness: number
  defaultWallHeight: number
}

export const SCHEMA_VERSION = 1

export interface Project {
  schemaVersion: typeof SCHEMA_VERSION
  id: Id
  name: string
  createdAt: string
  updatedAt: string
  settings: ProjectSettings
  nodes: Record<Id, WallNode>
  walls: Record<Id, Wall>
  openings: Record<Id, Opening>
  /** Móveis e objetos soltos. */
  items: Record<Id, Item>
  dimensions: Record<Id, Dimension>
  texts: Record<Id, TextNote>
  roomLabels: Record<Id, RoomLabel>
}
