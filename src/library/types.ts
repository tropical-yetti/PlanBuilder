/**
 * Contrato de um componente da biblioteca (docs/PLANO.md, seção 5).
 * Há dois tipos de componente:
 * - OpeningDef ("opening"): vai na parede e abre um vão (portas, janelas, cobogós);
 * - ItemDef ("item"): objeto solto no cômodo (móveis).
 * Para adicionar um componente: crie um arquivo em `components/<categoria>/` exportando a definição
 * e inclua-o na lista de `registry.ts`. O editor, a miniatura da biblioteca, o painel de
 * propriedades e a vista 3D são gerados a partir dela.
 */
import type { CategoryId } from './categories'

/** Preenchimentos do símbolo 2D. */
export type PrimFill = 'leaf' | 'glass' | 'solid' | 'soft' | 'wood' | 'concrete' | 'steel' | 'dark' | 'stone'

/**
 * Primitivas do símbolo 2D, em centímetros, no sistema local do componente:
 * - aberturas: origem no centro do vão, x ao longo da parede, y perpendicular (positivo = lado para onde abre);
 * - móveis: origem no centro, x na largura, y na profundidade (positivo = frente; o fundo fica em y negativo).
 * O editor cuida de posição, rotação e espelhamento; o componente só descreve o desenho "padrão".
 */
export type Prim =
  /** Linha poligonal; com `closed`, vira um polígono (e pode ter preenchimento). */
  | { t: 'line'; pts: number[]; dash?: boolean; thin?: boolean; closed?: boolean; fill?: PrimFill }
  /** Arco de `a0` a `a1` (radianos; ângulo crescente = sentido de x para y). */
  | { t: 'arc'; cx: number; cy: number; r: number; a0: number; a1: number; dash?: boolean; thin?: boolean }
  /** Retângulo; `r` arredonda os cantos. */
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: PrimFill; thin?: boolean; r?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; fill?: PrimFill; thin?: boolean }

export interface SymbolInput {
  /** Largura do vão. */
  width: number
  /** Espessura da parede onde está. */
  thickness: number
  params: Record<string, unknown>
}

export type Material =
  | 'frame'
  | 'leaf'
  | 'glass'
  | 'concrete'
  | 'wood'
  | 'fabric'
  | 'cushion'
  | 'sheet'
  | 'pillow'
  | 'metal'
  /** Aço inox (fogões, geladeiras). */
  | 'steel'
  /** Esmaltado branco (lavadoras). */
  | 'enamel'
  /** Laminado branco dos armários. */
  | 'cabinet'
  /** Pedra do tampo (granito). */
  | 'stone'
  /** Vidro escuro / ferro fundido (mesa do fogão, porta do forno). */
  | 'dark'

/**
 * Peça do modelo 3D: uma caixa, em centímetros, no sistema local da abertura:
 * x ao longo da parede (origem no centro do vão), y para cima a partir da base do vão,
 * z atravessando a parede (positivo = lado para onde abre).
 */
export interface Box3 {
  /** Centro da caixa. */
  x: number
  y: number
  z: number
  /** Tamanho ao longo da parede, na altura e na espessura. */
  w: number
  h: number
  d: number
  mat: Material
  /** Cilindro (mesas redondas): `w` é o diâmetro e `d` é ignorado. */
  shape?: 'box' | 'cylinder'
  /** Folha entreaberta: gira em torno do eixo vertical que passa por `pivot`, `angle` graus para o lado de abertura. */
  pivot?: { x: number; z: number }
  angle?: number
}

export interface ModelInput extends SymbolInput {
  /** Altura do vão. */
  height: number
}

export type ParamField =
  | { key: string; label: string; type: 'select'; options: { value: string | number; label: string }[] }
  | { key: string; label: string; type: 'boolean' }
  | { key: string; label: string; type: 'number'; min: number; max: number; suffix?: string }

export interface OpeningDef {
  /** Identificador estável, salvo nos projetos. Ex.: "door.swing-single". */
  id: string
  category: CategoryId
  /** Vai na parede e abre um vão. */
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
  /** Modelo 3D simples (batente, folhas, vidro). */
  model(input: ModelInput): Box3[]
  /** Ao inserir, a altura ocupa a parede inteira, do peitoril até o topo (painéis de cobogó). */
  fullHeight?: boolean
  /** Oferece "Ocupar a parede inteira" no painel de propriedades. */
  fillsWall?: boolean
  /** Peça de revestimento que preenche o vão (cobogó): lado da peça em cm, para estimar a quantidade. */
  pieceSize?(params: Record<string, unknown>): number
}

/** Antigo nome do contrato de aberturas. */
export type ComponentDef = OpeningDef

export interface ItemInput {
  /** Largura (x) e profundidade (y no símbolo, z no modelo 3D). Mesas redondas: ambas = diâmetro. */
  width: number
  depth: number
  params: Record<string, unknown>
}

export interface ItemModelInput extends ItemInput {
  height: number
}

/** Tamanho padrão oferecido como atalho no painel de propriedades. */
export interface ItemPreset {
  label: string
  width: number
  depth: number
}

/**
 * Parâmetro opcional de móveis pendurados ou apoiados (armário aéreo, lava-louças de bancada):
 * `params.elevation` é a altura, em cm, do piso até a base do móvel. A vista 3D o coloca nessa altura.
 */
export const ELEVATION_PARAM = 'elevation'

export interface ItemDef {
  id: string
  category: CategoryId
  /** Subgrupo dentro da categoria (ex.: "Camas"), usado para organizar a biblioteca. */
  group: string
  /** Objeto solto no cômodo. */
  kind: 'item'
  name: string
  tags: string[]
  defaults: { width: number; depth: number; height: number; params: Record<string, unknown> }
  presets?: ItemPreset[]
  limits: { minWidth: number; maxWidth: number; minDepth: number; maxDepth: number; minHeight: number; maxHeight: number }
  /** Redondo: largura e profundidade são o mesmo diâmetro. */
  round?: boolean
  /** Ao inserir ou arrastar perto de uma parede, o fundo encosta nela (sofás, camas, poltronas). */
  againstWall: boolean
  paramsSchema?: ParamField[]
  symbol(input: ItemInput): Prim[]
  /** Modelo 3D: x na largura, y para cima a partir do piso, z na profundidade (positivo = frente). */
  model(input: ItemModelInput): Box3[]
}

export type LibraryDef = OpeningDef | ItemDef
