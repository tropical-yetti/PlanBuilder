import type { Point } from '../../model/types'

export interface PointerInfo {
  /** Posição no mundo (cm). */
  world: Point
  /** Posição na tela (px, relativa ao canvas). */
  screen: Point
  shift: boolean
  alt: boolean
  ctrl: boolean
  button: number
}

export interface ToolKey {
  key: string
  shift?: boolean
  ctrl?: boolean
  alt?: boolean
}

/** Uma ferramenta do editor 2D: recebe eventos do canvas já convertidos para coordenadas do mundo. */
export interface Tool {
  onPointerDown?(e: PointerInfo): void
  onPointerMove?(e: PointerInfo): void
  onPointerUp?(e: PointerInfo): void
  onDoubleClick?(e: PointerInfo): void
  /** Retorna true se a tecla foi usada pela ferramenta (o atalho global então é ignorado). */
  onKeyDown?(e: ToolKey): boolean
  /** Chamado quando o usuário troca de ferramenta: deve descartar o que estiver pela metade. */
  onDeactivate?(): void
  /** Cursor CSS do canvas. */
  cursor(): string
}
