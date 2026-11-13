/**
 * Salvamento automático no navegador (localStorage), para continuar de onde parou.
 * Versão simples, antecipada da fase 5: lá entram migrações de versão, salvar/abrir arquivo e avisos.
 */
import { SCHEMA_VERSION, type Project } from '../model/types'
import { DEFAULT_LAYERS, useEditorStore, type Layers } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

export const AUTOSAVE_KEY = 'planbuilder:autosave'
/** Preferências de exibição (camadas visíveis): guardadas à parte, não fazem parte do projeto. */
export const VIEW_KEY = 'planbuilder:view'
const DELAY_MS = 500

interface Saved {
  savedAt: string
  project: Project
}

function looksLikeProject(x: unknown): x is Project {
  if (!x || typeof x !== 'object') return false
  const p = x as Record<string, unknown>
  return (
    p.schemaVersion === SCHEMA_VERSION &&
    typeof p.id === 'string' &&
    ['nodes', 'walls', 'openings', 'settings'].every((k) => p[k] !== null && typeof p[k] === 'object')
  )
}

export function loadAutosave(storage: Storage | undefined = globalThis.localStorage): Project | null {
  try {
    const raw = storage?.getItem(AUTOSAVE_KEY)
    if (!raw) return null
    const saved = JSON.parse(raw) as Partial<Saved>
    if (!looksLikeProject(saved.project)) return null
    // Campos adicionados depois da primeira versão do esquema ganham valor vazio.
    const defaults = { items: {}, dimensions: {}, texts: {}, roomLabels: {} }
    return { ...defaults, ...(saved.project as object) } as Project
  } catch {
    return null
  }
}

export function writeAutosave(project: Project, storage: Storage | undefined = globalThis.localStorage): boolean {
  try {
    const data: Saved = { savedAt: new Date().toISOString(), project }
    storage?.setItem(AUTOSAVE_KEY, JSON.stringify(data))
    return true
  } catch {
    // Armazenamento cheio ou bloqueado (ex.: navegação privada): o aviso ao usuário chega na fase 5.
    return false
  }
}

export function loadLayers(storage: Storage | undefined = globalThis.localStorage): Layers {
  try {
    const saved = JSON.parse(storage?.getItem(VIEW_KEY) ?? '{}') as { layers?: Partial<Layers> }
    const layers = { ...DEFAULT_LAYERS }
    for (const key of Object.keys(layers) as (keyof Layers)[]) {
      if (typeof saved.layers?.[key] === 'boolean') layers[key] = saved.layers[key]
    }
    return layers
  } catch {
    return { ...DEFAULT_LAYERS }
  }
}

export function saveLayers(layers: Layers, storage: Storage | undefined = globalThis.localStorage): void {
  try {
    storage?.setItem(VIEW_KEY, JSON.stringify({ layers }))
  } catch {
    // sem espaço ou bloqueado: a preferência só não é lembrada
  }
}

/** Restaura o último projeto e passa a salvar a cada alteração. Retorna a função que desliga. */
export function startAutosave(): () => void {
  const restored = loadAutosave()
  if (restored) useProjectStore.getState().load(restored)
  useEditorStore.getState().setLayers(loadLayers())
  const unsubscribeView = useEditorStore.subscribe((s, prev) => {
    if (s.layers !== prev.layers) saveLayers(s.layers)
  })

  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    timer = undefined
    writeAutosave(useProjectStore.getState().project)
  }
  const unsubscribe = useProjectStore.subscribe((s, prev) => {
    if (s.project === prev.project) return
    clearTimeout(timer)
    timer = setTimeout(flush, DELAY_MS)
  })
  // Garante o último estado ao fechar ou recarregar a aba.
  const onHide = () => {
    if (timer !== undefined) flush()
  }
  window.addEventListener('pagehide', onHide)
  return () => {
    unsubscribe()
    unsubscribeView()
    window.removeEventListener('pagehide', onHide)
    clearTimeout(timer)
  }
}
