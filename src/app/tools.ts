import type { ToolId } from '../store/editorStore'

export interface ToolInfo {
  id: ToolId
  label: string
  shortcut: string
  /** Texto da barra de status: o que o usuário deve fazer a seguir. */
  hint: string
}

/** Ferramentas da barra lateral, na ordem em que aparecem (docs/PLANO.md, seção 3). */
export const TOOLS: ToolInfo[] = [
  { id: 'select', label: 'Selecionar', shortcut: 'V', hint: 'Clique para selecionar · Shift+clique adiciona · arraste para seleção em caixa' },
  { id: 'wall', label: 'Parede', shortcut: 'W', hint: 'Clique para iniciar a parede · digite o comprimento + Enter · Esc encerra' },
  { id: 'room', label: 'Cômodo retangular', shortcut: 'A', hint: 'Clique e arraste para criar um cômodo · ou digite 400x300 + Enter' },
  { id: 'erase', label: 'Excluir', shortcut: 'E', hint: 'Clique no objeto que deseja excluir' },
  { id: 'measure', label: 'Medir', shortcut: 'M', hint: 'Clique em dois pontos para medir a distância' },
  { id: 'dimension', label: 'Cota', shortcut: 'D', hint: 'Clique em dois pontos para criar uma cota' },
  { id: 'text', label: 'Texto', shortcut: 'T', hint: 'Clique na planta para inserir um texto' },
]

export function getTool(id: ToolId): ToolInfo {
  const tool = TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Ferramenta desconhecida: ${id}`)
  return tool
}
