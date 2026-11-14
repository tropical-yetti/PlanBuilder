import type { ToolId } from '../store/editorStore'

export interface ToolInfo {
  id: ToolId
  label: string
  shortcut: string
  /** Texto da barra de status: o que o usuário deve fazer a seguir. */
  hint: string
  /** Ferramentas ainda não implementadas aparecem desativadas. */
  available: boolean
}

/** Ferramentas da barra lateral, na ordem em que aparecem (docs/PLANO.md, seção 3). */
export const TOOLS: ToolInfo[] = [
  { id: 'select', label: 'Selecionar', shortcut: 'V', hint: 'Clique seleciona · Shift+clique adiciona · arraste no vazio para selecionar em caixa · arraste a parede para movê-la · duplo clique na parede insere um nó · duplo clique no cômodo edita o nome', available: true },
  { id: 'wall', label: 'Parede', shortcut: 'W', hint: 'Clique para iniciar · clique para cada canto · digite o comprimento + Enter · Shift trava 15° · Alt desliga os snaps · Esc encerra', available: true },
  { id: 'room', label: 'Cômodo retangular', shortcut: 'A', hint: 'Clique e arraste para criar um cômodo · após o 1º canto, digite 400x300 + Enter (medidas pelo eixo das paredes)', available: true },
  { id: 'erase', label: 'Excluir', shortcut: 'E', hint: 'Clique no objeto que deseja excluir', available: true },
  { id: 'measure', label: 'Medir', shortcut: 'M', hint: 'Clique em dois pontos para medir a distância · Shift trava o ângulo · a medida não é salva · Esc limpa', available: true },
  { id: 'dimension', label: 'Cota', shortcut: 'D', hint: 'Clique nos dois pontos a medir e depois onde a linha de cota deve ficar · Esc cancela', available: true },
  { id: 'text', label: 'Texto', shortcut: 'T', hint: 'Clique na planta para escrever · clique num texto para editar · Enter confirma', available: true },
]

/** Inserção de componentes: ativada pela biblioteca, não aparece na barra de ferramentas. */
const PLACE_TOOL: ToolInfo = {
  id: 'place',
  label: 'Inserir',
  shortcut: '',
  hint: 'Mova até uma parede e clique para inserir · abre para o lado do cursor · F inverte a dobradiça · Esc encerra',
  available: true,
}

export function getTool(id: ToolId): ToolInfo {
  const tool = id === 'place' ? PLACE_TOOL : TOOLS.find((t) => t.id === id)
  if (!tool) throw new Error(`Ferramenta desconhecida: ${id}`)
  return tool
}
