import { create } from 'zustand'
import type { Id, Point } from '../model/types'

/** Ferramentas do editor 2D (docs/PLANO.md, seção 3). */
export type ToolId = 'select' | 'wall' | 'room' | 'erase' | 'measure' | 'dimension' | 'text' | 'place'

export type ViewMode = '2d' | 'split' | '3d'

export type SidePanelTab = 'properties' | 'areas' | 'history'

/** O que aparece no desenho 2D (menu Camadas). */
export interface Layers {
  grid: boolean
  /** Comprimento de cada parede. */
  autoDimensions: boolean
  /** Cotas manuais. */
  dimensions: boolean
  texts: boolean
  openings: boolean
  /** Nomes e áreas dos cômodos. */
  roomLabels: boolean
}

export const LAYER_LABELS: Record<keyof Layers, string> = {
  grid: 'Grade',
  autoDimensions: 'Medidas das paredes',
  dimensions: 'Cotas',
  texts: 'Textos',
  openings: 'Portas e janelas',
  roomLabels: 'Nomes e áreas dos cômodos',
}

export const DEFAULT_LAYERS: Layers = { grid: true, autoDimensions: true, dimensions: true, texts: true, openings: true, roomLabels: true }

/** Objeto (ou lugar) em que o menu de contexto foi aberto. */
export interface ContextTarget {
  /** Posição na página, para desenhar o menu. */
  page: Point
  /** Posição no mundo (cm). */
  world: Point
  /** Objeto sob o cursor, se houver. */
  id: Id | null
  /** Cômodo sob o cursor, se houver. */
  roomKey: string | null
}

export type Dialog =
  | { kind: 'palette' }
  | { kind: 'shortcuts' }
  | { kind: 'prompt'; title: string; label: string; suffix?: string; initial: string; onSubmit: (value: number) => void }
  | { kind: 'confirm'; title: string; message: string; confirmLabel: string; onConfirm: () => void }
  | { kind: 'export' }

/** Aviso passageiro no canto da tela. */
export interface Notice {
  text: string
  kind: 'info' | 'error'
}

/** Arquivo em que o projeto está salvo no computador. */
export interface FileState {
  /** Nome do arquivo; null enquanto o projeto só existe neste navegador. */
  name: string | null
  /** `revision` do documento quando foi salvo ou aberto pela última vez. */
  savedRevision: number
}

/** Texto sendo criado (id null) ou editado sobre a planta. */
export interface TextEdit {
  id: Id | null
  at: Point
  initial: string
}

/** Transformação da vista 2D: tela = mundo × scale + (x, y). `scale` em pixels por centímetro. */
export interface View2D {
  x: number
  y: number
  scale: number
}

export const MIN_SCALE = 0.05
export const MAX_SCALE = 8

/** Estado da interface: não faz parte do documento e não entra no desfazer/refazer. */
export interface EditorState {
  tool: ToolId
  /** Componente da biblioteca sendo inserido (ferramenta "place"). */
  placing: string | null
  viewMode: ViewMode
  sidePanelTab: SidePanelTab
  view: View2D
  /** Ids selecionados (paredes, por enquanto; depois aberturas, cotas, textos). */
  selection: Id[]
  /** Chave do cômodo cujo nome está sendo editado sobre a planta. */
  renamingRoom: string | null
  layers: Layers
  contextMenu: ContextTarget | null
  dialog: Dialog | null
  textEdit: TextEdit | null
  notice: Notice | null
  file: FileState
  /** A vista (zoom e posição) foi restaurada da última sessão: o canvas não deve reenquadrar ao abrir. */
  viewRestored: boolean
  /** Tamanho do canvas 2D em pixels (0 enquanto não montado). */
  canvasSize: { width: number; height: number }

  setTool: (tool: ToolId) => void
  /** Começa a inserir um componente da biblioteca. */
  startPlacing: (componentId: string) => void
  setViewMode: (mode: ViewMode) => void
  setSidePanelTab: (tab: SidePanelTab) => void
  setView: (view: View2D) => void
  /** Zoom mantendo fixo o ponto da tela `anchor`. */
  zoomAt: (anchor: Point, factor: number) => void
  setSelection: (ids: Id[]) => void
  setCanvasSize: (size: { width: number; height: number }) => void
  setRenamingRoom: (key: string | null) => void
  toggleLayer: (layer: keyof Layers) => void
  setLayers: (layers: Layers) => void
  setContextMenu: (target: ContextTarget | null) => void
  setDialog: (dialog: Dialog | null) => void
  setTextEdit: (edit: TextEdit | null) => void
  notify: (text: string, kind?: Notice['kind']) => void
  clearNotice: () => void
  setFile: (file: FileState) => void
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  tool: 'select',
  placing: null,
  viewMode: '2d',
  sidePanelTab: 'properties',
  view: { x: 0, y: 0, scale: 1 },
  selection: [],
  canvasSize: { width: 0, height: 0 },
  renamingRoom: null,
  layers: { ...DEFAULT_LAYERS },
  contextMenu: null,
  dialog: null,
  textEdit: null,
  notice: null,
  file: { name: null, savedRevision: 0 },
  viewRestored: false,

  setTool: (tool) => set(tool === 'place' ? { tool } : { tool, placing: null }),
  startPlacing: (componentId) => set({ tool: 'place', placing: componentId }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSidePanelTab: (sidePanelTab) => set({ sidePanelTab }),
  setView: (view) => set({ view }),
  zoomAt: (anchor, factor) => {
    const v = get().view
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor))
    const k = scale / v.scale
    set({ view: { scale, x: anchor.x - (anchor.x - v.x) * k, y: anchor.y - (anchor.y - v.y) * k } })
  },
  setSelection: (selection) => set({ selection }),
  setCanvasSize: (canvasSize) => set({ canvasSize }),
  setRenamingRoom: (renamingRoom) => set({ renamingRoom }),
  toggleLayer: (layer) => set({ layers: { ...get().layers, [layer]: !get().layers[layer] } }),
  setLayers: (layers) => set({ layers }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setDialog: (dialog) => set({ dialog }),
  setTextEdit: (textEdit) => set({ textEdit }),
  notify: (text, kind = 'info') => set({ notice: { text, kind } }),
  clearNotice: () => set({ notice: null }),
  setFile: (file) => set({ file }),
}))

export const screenToWorld = (v: View2D, s: Point): Point => ({ x: (s.x - v.x) / v.scale, y: (s.y - v.y) / v.scale })
export const worldToScreen = (v: View2D, w: Point): Point => ({ x: w.x * v.scale + v.x, y: w.y * v.scale + v.y })
