import { describe, expect, it } from 'vitest'
import { emptyProject } from '../model/testUtils'
import { drawRectRoom } from '../model/walls'
import { AUTOSAVE_KEY, loadAutosave, loadViewPrefs, saveViewPrefs, VIEW_KEY, writeAutosave } from './autosave'

class MemoryStorage implements Storage {
  private m = new Map<string, string>()
  get length() {
    return this.m.size
  }
  clear() {
    this.m.clear()
  }
  getItem(k: string) {
    return this.m.get(k) ?? null
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  setItem(k: string, v: string) {
    this.m.set(k, v)
  }
}

describe('autosave', () => {
  it('ida e volta preserva o projeto', () => {
    const s = new MemoryStorage()
    const p = emptyProject()
    drawRectRoom(p, { x: 0, y: 0 }, { x: 400, y: 300 })
    expect(writeAutosave(p, s)).toBe(true)
    expect(loadAutosave(s)).toEqual(p)
  })

  it('ignora conteúdo inválido ou de outra versão', () => {
    const s = new MemoryStorage()
    expect(loadAutosave(s)).toBeNull()
    s.setItem(AUTOSAVE_KEY, '{quebrado')
    expect(loadAutosave(s)).toBeNull()
    s.setItem(AUTOSAVE_KEY, JSON.stringify({ project: { ...emptyProject(), schemaVersion: 99 } }))
    expect(loadAutosave(s)).toBeNull()
  })

  it('não quebra se o armazenamento recusar a gravação', () => {
    const s = new MemoryStorage()
    s.setItem = () => {
      throw new Error('QuotaExceededError')
    }
    expect(writeAutosave(emptyProject(), s)).toBe(false)
  })

  it('lembra camadas e vista, ignorando valores inválidos', () => {
    const s = new MemoryStorage()
    expect(loadViewPrefs(s).view).toBeNull()
    const layers = { ...loadViewPrefs(s).layers, grid: false }
    saveViewPrefs({ layers, view: { x: 10, y: 20, scale: 2 }, projectId: 'abc' }, s)
    expect(loadViewPrefs(s)).toEqual({ layers, view: { x: 10, y: 20, scale: 2 }, projectId: 'abc' })
    s.setItem(VIEW_KEY, JSON.stringify({ layers: { grid: 'sim' }, view: { x: 1, y: 2, scale: 9999 } }))
    const p = loadViewPrefs(s)
    expect(p.layers.grid).toBe(true)
    expect(p.view).toBeNull()
  })
})
