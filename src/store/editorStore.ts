import { create } from 'zustand'
import type { Id, Point } from '../model/types'

/** Ferramentas do editor 2D (docs/PLANO.md, seção 3). */
export type ToolId = 'select' | 'wall' | 'room' | 'erase' | 'measure' | 'dimension' | 'text'

export type ViewMode = '2d' | 'split' | '3d'

export type SidePanelTab = 'properties' | 'areas'

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
  viewMode: ViewMode
  sidePanelTab: SidePanelTab
  view: View2D
  /** Ids selecionados (paredes, por enquanto; depois aberturas, cotas, textos). */
  selection: Id[]
  /** Tamanho do canvas 2D em pixels (0 enquanto não montado). */
  canvasSize: { width: number; height: number }

  setTool: (tool: ToolId) => void
  setViewMode: (mode: ViewMode) => void
  setSidePanelTab: (tab: SidePanelTab) => void
  setView: (view: View2D) => void
  /** Zoom mantendo fixo o ponto da tela `anchor`. */
  zoomAt: (anchor: Point, factor: number) => void
  setSelection: (ids: Id[]) => void
  setCanvasSize: (size: { width: number; height: number }) => void
}

export const useEditorStore = create<EditorState>()((set, get) => ({
  tool: 'select',
  viewMode: '2d',
  sidePanelTab: 'properties',
  view: { x: 0, y: 0, scale: 1 },
  selection: [],
  canvasSize: { width: 0, height: 0 },

  setTool: (tool) => set({ tool }),
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
}))

export const screenToWorld = (v: View2D, s: Point): Point => ({ x: (s.x - v.x) / v.scale, y: (s.y - v.y) / v.scale })
export const worldToScreen = (v: View2D, w: Point): Point => ({ x: w.x * v.scale + v.x, y: w.y * v.scale + v.y })
