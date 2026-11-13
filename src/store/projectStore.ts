import { applyPatches, enablePatches, produceWithPatches, type Draft, type Patch } from 'immer'
import { create } from 'zustand'
import { createEmptyProject } from '../model/project'
import type { Project } from '../model/types'

enablePatches()

/** Número máximo de passos guardados no histórico (docs/PLANO.md, seção 6). */
export const HISTORY_LIMIT = 100

export interface HistoryEntry {
  /** Descrição curta exibida no histórico, ex.: "Parede criada". */
  label: string
  patches: Patch[]
  inversePatches: Patch[]
}

export interface ProjectState {
  project: Project
  past: HistoryEntry[]
  future: HistoryEntry[]
  /** Transação aberta (ex.: um arraste): várias alterações viram um único passo. */
  pending: HistoryEntry | null
  /** Incrementado a cada alteração do documento; usado por autosave e "alterações não salvas". */
  revision: number

  /** Aplica uma alteração ao documento e registra no histórico. */
  update: (label: string, recipe: (draft: Draft<Project>) => void) => void
  /** Abre uma transação: as próximas alterações viram um único passo até `commit`. */
  begin: (label: string) => void
  commit: () => void
  /** Desfaz tudo o que foi feito na transação aberta (ex.: Esc durante um arraste). */
  cancel: () => void
  undo: () => void
  redo: () => void
  /** Substitui o documento (novo projeto, abrir arquivo) e limpa o histórico. */
  load: (project: Project) => void
}

function pushLimited(stack: HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  const next = [...stack, entry]
  return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  project: createEmptyProject(),
  past: [],
  future: [],
  pending: null,
  revision: 0,

  update(label, recipe) {
    const { project, pending, past, revision } = get()
    const [next, patches, inversePatches] = produceWithPatches(project, recipe)
    if (patches.length === 0) return

    if (pending) {
      set({
        project: next,
        revision: revision + 1,
        pending: {
          label: pending.label,
          patches: [...pending.patches, ...patches],
          // Para desfazer, as inversas são aplicadas da mais recente para a mais antiga.
          inversePatches: [...inversePatches, ...pending.inversePatches],
        },
      })
      return
    }

    set({
      project: next,
      revision: revision + 1,
      past: pushLimited(past, { label, patches, inversePatches }),
      future: [],
    })
  },

  begin(label) {
    get().commit()
    set({ pending: { label, patches: [], inversePatches: [] } })
  },

  commit() {
    const { pending, past } = get()
    if (!pending) return
    if (pending.patches.length === 0) {
      set({ pending: null })
      return
    }
    set({ pending: null, past: pushLimited(past, pending), future: [] })
  },

  cancel() {
    const { pending, project, revision } = get()
    if (!pending) return
    if (pending.patches.length === 0) {
      set({ pending: null })
      return
    }
    set({
      pending: null,
      project: applyPatches(project, pending.inversePatches),
      revision: revision + 1,
    })
  },

  undo() {
    get().commit()
    const { past, future, project, revision } = get()
    const entry = past.at(-1)
    if (!entry) return
    set({
      project: applyPatches(project, entry.inversePatches),
      past: past.slice(0, -1),
      future: [...future, entry],
      revision: revision + 1,
    })
  },

  redo() {
    get().commit()
    const { past, future, project, revision } = get()
    const entry = future.at(-1)
    if (!entry) return
    set({
      project: applyPatches(project, entry.patches),
      past: pushLimited(past, entry),
      future: future.slice(0, -1),
      revision: revision + 1,
    })
  },

  load(project) {
    set({ project, past: [], future: [], pending: null, revision: get().revision + 1 })
  },
}))

export const selectCanUndo = (s: ProjectState) => s.past.length > 0 || (s.pending?.patches.length ?? 0) > 0
export const selectCanRedo = (s: ProjectState) => s.future.length > 0
