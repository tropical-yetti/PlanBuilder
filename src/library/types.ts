/**
 * Contrato de um componente da biblioteca (docs/PLANO.md, seção 5).
 * Para adicionar um componente: crie um arquivo em `components/<categoria>/` exportando um
 * ComponentDef e inclua-o na lista de `registry.ts`. O editor, a miniatura da biblioteca e o
 * painel de propriedades são gerados a partir desta definição.
 */
import type { CategoryId } from './categories'

/**
 * Primitivas do símbolo 2D, em centímetros, no sistema local da abertura:
 * origem no centro do vão, x ao longo da parede, y perpendicular (positivo = lado para onde abre).
 * O editor cuida de posição, rotação e inversões; o componente só descreve o desenho "padrão".
 */
export type Prim =
  | { t: 'line'; pts: number[]; dash?: boolean; thin?: boolean }
  /** Arco de `a0` a `a1` (radianos; ângulo crescente = sentido de x para y). */
  | { t: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; dash?: boolean; thin?: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: 'leaf' | 'glass'; thin?: boolean }

export interface SymbolInput {
  /** Largura do vão. */
  width: number
  /** Espessura da parede onde está. */
  thickness: number
  params: Record<string, unknown>
}

export type ParamField =
  | { key: string; label: string; type: 'select'; options: { value: string | number; label: string }[] }
  | { key: string; label: string; type: 'boolean' }
  | { key: string; label: string; type: 'number'; min: number; max: number; suffix?: string }

export interface ComponentDef {
  /** Identificador estável, salvo nos projetos. Ex.: "door.swing-single". */
  id: string
  category: CategoryId
  /** "opening" = vai na parede e abre um vão. ("item", solto no ambiente, chega depois do MVP.) */
  kind: 'opening'
  name: string
  /** Palavras para a busca, além do nome. */
  tags: string[]
  defaults: { width: number; height: number; sillHeight: number; params: Record<string, unknown> }
  /** Larguras comuns oferecidas como atalho no painel de propriedades. */
  presets?: number[]
  limits: { minWidth: number; maxWidth: number; minHeight: number; maxHeight: number }
  /** Tem lado de abertura (faz sentido "inverter lado"). */
  sided: boolean
  /** Tem dobradiça à esquerda/direita (faz sentido "inverter dobradiça"). */
  hinged: boolean
  /** Tem peitoril editável (janelas). */
  hasSill: boolean
  /** Parâmetros próprios do componente; viram campos no painel de propriedades. */
  paramsSchema?: ParamField[]
  /** Símbolo de planta. */
  symbol(input: SymbolInput): Prim[]
}
