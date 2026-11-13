import { useEditorStore } from '../../store/editorStore'
import { useProjectStore } from '../../store/projectStore'
import { useInteractionStore } from '../interactionStore'

/** Atalhos usados pelas ferramentas para ler e alterar o estado. */
export const project = () => useProjectStore.getState().project
export const docStore = () => useProjectStore.getState()
export const editor = () => useEditorStore.getState()
export const ui = () => useInteractionStore.getState()
export const pxPerCm = () => useEditorStore.getState().view.scale
