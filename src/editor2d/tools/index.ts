import { useEditorStore, type ToolId } from '../../store/editorStore'
import { useInteractionStore } from '../interactionStore'
import { createEraseTool } from './eraseTool'
import { createRoomTool } from './roomTool'
import { createSelectTool } from './selectTool'
import type { Tool } from './types'
import { createWallTool } from './wallTool'

const idle: Tool = { cursor: () => 'default' }

export const tools: Record<ToolId, Tool> = {
  select: createSelectTool(),
  wall: createWallTool(),
  room: createRoomTool(),
  erase: createEraseTool(),
  // Medir, Cota e Texto chegam na fase 4 (feat/produtividade).
  measure: idle,
  dimension: idle,
  text: idle,
}

export const activeTool = (): Tool => tools[useEditorStore.getState().tool]

// Ao trocar de ferramenta, a anterior descarta o que estiver pela metade.
useEditorStore.subscribe((s, prev) => {
  if (s.tool !== prev.tool) {
    tools[prev.tool].onDeactivate?.()
    useInteractionStore.getState().set({ snap: null, draft: null, typed: '', box: null, hover: null })
  }
})
