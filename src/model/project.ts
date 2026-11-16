import { nanoid } from 'nanoid'
import { SCHEMA_VERSION, type Project, type ProjectSettings } from './types'

export const DEFAULT_SETTINGS: ProjectSettings = {
  gridSize: 10,
  defaultWallThickness: 15,
  defaultWallHeight: 280,
}

export function newId(): string {
  return nanoid(10)
}

export function createEmptyProject(name = 'Projeto sem título', now = new Date()): Project {
  const iso = now.toISOString()
  return {
    schemaVersion: SCHEMA_VERSION,
    id: newId(),
    name,
    createdAt: iso,
    updatedAt: iso,
    settings: { ...DEFAULT_SETTINGS },
    nodes: {},
    walls: {},
    openings: {},
    items: {},
    dimensions: {},
    texts: {},
    roomLabels: {},
    floors: {},
  }
}
