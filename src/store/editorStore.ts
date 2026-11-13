import { create } from 'zustand'

/** Ferramentas do editor 2D (docs/PLANO.md, seção 3). */
export type ToolId = 'select' | 'wall' | 'room' | 'erase' | 'measure' | 'dimension' | 'text'

export type ViewMode = '2d' | 'split' | '3d'

export type SidePanelTab = 'properties' | 'areas'

/** Estado da interface: não faz parte do documento e não entra no desfazer/refazer. */
export interface EditorState {
  tool: ToolId
  viewMode: ViewMode
  sidePanelTab: SidePanelTab
  setTool: (tool: ToolId) => void
  setViewMode: (mode: ViewMode) => void
  setSidePanelTab: (tab: SidePanelTab) => void
}

export const useEditorStore = create<EditorState>()((set) => ({
  tool: 'select',
  viewMode: '2d',
  sidePanelTab: 'properties',
  setTool: (tool) => set({ tool }),
  setViewMode: (viewMode) => set({ viewMode }),
  setSidePanelTab: (sidePanelTab) => set({ sidePanelTab }),
}))
