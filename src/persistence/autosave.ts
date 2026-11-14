/**
 * Salvamento automático no navegador (localStorage), para continuar de onde parou:
 * o projeto, as camadas visíveis e a posição/zoom da vista.
 */
import type { Project } from '../model/types'
import { DEFAULT_LAYERS, MAX_SCALE, MIN_SCALE, useEditorStore, type Layers, type View2D } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { parseProjectData } from './schema'

export const AUTOSAVE_KEY = 'planbuilder:autosave'
/** Preferências de exibição (camadas e vista): guardadas à parte, não fazem parte do projeto. */
export const VIEW_KEY = 'planbuilder:view'
const DELAY_MS = 500

export function loadAutosave(storage: Storage | undefined = globalThis.localStorage): Project | null {
  try {
    const raw = storage?.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const r = parseProjectData(JSON.parse(raw))
    return r.ok ? r.project : null
  } catch {
    return null
  }
}

export function writeAutosave(project: Project, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    storage?.setItem(AUTOSAVE_KEY, JSON.stringify({ savedAt: new Date().toISOString(), project }))
    return true
  } catch {
    // Armazenamento cheio ou bloqueado (ex.: navegação privada).
    return false
  }
}

interface ViewPrefs {
  layers: Layers
  /** Vista da última sessão e o projeto a que ela pertence. */
  view: View2D | null
  projectId: string | null
}

export function loadViewPrefs(storage: Storage | undefined = globalThis.localStorage): ViewPrefs {
  const prefs: ViewPrefs = { layers: { ...DEFAULT_LAYERS }, view: null, projectId: null }
  try {
    const saved = JSON.parse(storage?.getItem(VIEW_KEY) ?? '{}') as { layers?: Partial<Layers>; view?: Partial<View2D>; projectId?: unknown }
    for (const key of Object.keys(prefs.layers) as (keyof Layers)[]) {
      if (typeof saved.layers?.[key] === 'boolean') prefs.layers[key] = saved.layers[key]
    }
    const v = saved.view
    if (v && [v.x, v.y, v.scale].every((n) => typeof n === 'number' && Number.isFinite(n)) && v.scale! >= MIN_SCALE && v.scale! <= MAX_SCALE) {
      prefs.view = { x: v.x!, y: v.y!, scale: v.scale! }
      prefs.projectId = typeof saved.projectId === 'string' ? saved.projectId : null
    }
  } catch {
    // preferências ilegíveis: usa o padrão
  }
  return prefs
}

export function saveViewPrefs(prefs: ViewPrefs, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(VIEW_KEY, JSON.stringify(prefs))
  } catch {
    // sem espaço ou bloqueado: a preferência só não é lembrada
  }
}

/** Restaura a última sessão e passa a salvar a cada alteração. Retorna a função que desliga. */
export function startAutosave(): () => void {
  const restored = loadAutosave()
  if (restored) useProjectStore.getState().load(restored)
  const editor = useEditorStore.getState()
  editor.setFile({ name: null, savedRevision: useProjectStore.getState().revision })

  const prefs = loadViewPrefs()
  editor.setLayers(prefs.layers)
  // A vista só é reaproveitada se for do mesmo projeto restaurado.
  if (restored && prefs.view && prefs.projectId === restored.id) useEditorStore.setState({ view: prefs.view, viewRestored: true })

  let timer: ReturnType<typeof setTimeout> | undefined
  let warned = false
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    const ok = writeAutosave(useProjectStore.getState().project)
    if (!ok && !warned) {
      warned = true
      useEditorStore.getState().notify('Não foi possível salvar automaticamente neste navegador. Use "Salvar" para guardar o projeto em arquivo.', 'error')
    }
    if (ok) warned = false
  }
  const unsubscribe = useProjectStore.subscribe((s, prev) => {
    if (s.project === prev.project) return
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY_MS)
  })

  let viewTimer: ReturnType<typeof setTimeout> | undefined
  const flushView = () => {
    clearTimeout(viewTimer)
    viewTimer = undefined
    const e = useEditorStore.getState()
    saveViewPrefs({ layers: e.layers, view: e.view, projectId: useProjectStore.getState().project.id })
  }
  const unsubscribeView = useEditorStore.subscribe((s, prev) => {
    if (s.layers === prev.layers && s.view === prev.view) return
    clearTimeout(viewTimer)
    viewTimer = setTimeout(flushView, DELAY_MS)
  })

  // Garante o último estado ao fechar ou recarregar a aba.
  const onHide = () => {
    if (timer !== undefined) flush()
    flushView()
  }
  window.addEventListener('pagehide', onHide)
  return () => {
    unsubscribe()
    unsubscribeView()
    window.removeEventListener('pagehide', onHide)
    clearTimeout(timer)
    clearTimeout(viewTimer)
  }
}
