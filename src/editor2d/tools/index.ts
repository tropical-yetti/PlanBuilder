import { useEditorStore, type ToolId } from '../../store/editorStore'
import { useInteractionStore } from '../interactionStore'
import { createDimensionTool } from './dimensionTool'
import { createEraseTool } from './eraseTool'
import { createMeasureTool } from './measureTool'
import { createPlaceTool } from './placeTool'
import { createRoomTool } from './roomTool'
import { createSelectTool } from './selectTool'
import { createTextTool } from './textTool'
import type { Tool } from './types'
import { createWallTool } from './wallTool'

export const tools: Record<ToolId, Tool> = {
  select: createSelectTool(),
  wall: createWallTool(),
  room: createRoomTool(),
  erase: createEraseTool(),
  place: createPlaceTool(),
  measure: createMeasureTool(),
  dimension: createDimensionTool(),
  text: createTextTool(),
}

export const activeTool = (): Tool => tools[useEditorStore.getState().tool]

// Ao trocar de ferramenta, a anterior descarta o que estiver pela metade.
useEditorStore.subscribe((s, prev) => {
  if (s.tool !== prev.tool) {
    tools[prev.tool].onDeactivate?.()
    useInteractionStore.getState().set({ snap: null, draft: null, typed: '', box: null, hover: null })
  }
})
