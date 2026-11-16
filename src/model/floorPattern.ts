/**
 * Geometria das paginações de piso (docs/PLANO.md, seção 11.1).
 *
 * Toda paginação é periódica: basta descrever um ladrilho retangular (`tile`) que se repete.
 * O ladrilho é desenhado uma vez (planta, miniatura da biblioteca, textura do 3D) e repetido,
 * girado de `angle` graus em torno da origem do piso. Medidas em cm.
 */
import type { FloorPattern } from './types'

export interface PieceRect {
  x: number
  y: number
  w: number
  h: number
  /** Variação de tom da peça, de −1 a 1 (estável: a mesma peça sempre tem o mesmo tom). */
  shade: number
}

export interface FloorTile {
  /** Tamanho do ladrilho que se repete. */
  w: number
  h: number
  /** Peças no sistema do ladrilho; podem passar da borda (o desenho é recortado no ladrilho). */
  pieces: PieceRect[]
  /** Giro da paginação, em graus. */
  angle: number
}

export interface PatternSpec {
  pattern: FloorPattern
  width: number
  length: number
  joint: number
  rotation: number
}

/** Ruído determinístico em [−1, 1]. */
function shadeAt(i: number, j: number): number {
  const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

const intersects = (r: PieceRect, w: number, h: number) => r.x < w && r.x + r.w > 0 && r.y < h && r.y + r.h > 0

/**
 * Ladrilho da paginação. Réguas e tacos têm o comprimento ao longo de x (fiadas horizontais);
 * `rotation` gira as fiadas. Espinha de peixe e tabuleiro arredondam a largura para que um número
 * inteiro de peças caiba no comprimento, como nas peças de verdade.
 */
export function floorTile(spec: PatternSpec): FloorTile {
  const W = Math.max(1, spec.width)
  const L = Math.max(1, spec.length)
  const j = Math.max(0, Math.min(spec.joint, Math.min(W, L) / 4))
  const half = j / 2
  const rect = (x: number, y: number, w: number, h: number, shade: number): PieceRect => ({ x: x + half, y: y + half, w: w - j, h: h - j, shade })
  const rot = spec.rotation

  switch (spec.pattern) {
    case 'grid':
    case 'diagonal': {
      const pw = L + j
      const ph = W + j
      // 2 × 2 peças por ladrilho, para a variação de tom não ficar idêntica em todas.
      const pieces = [0, 1].flatMap((a) => [0, 1].map((b) => rect(a * pw, b * ph, pw, ph, shadeAt(a, b))))
      return { w: 2 * pw, h: 2 * ph, pieces, angle: rot + (spec.pattern === 'diagonal' ? 45 : 0) }
    }
    case 'stagger': {
      const pw = L + j
      const ph = W + j
      // Quatro fiadas, cada uma deslocada: 0, ½, ¼ e ¾ do comprimento (parece aleatório, mas repete).
      const shifts = [0, 0.5, 0.25, 0.75]
      const pieces: PieceRect[] = []
      shifts.forEach((s, row) => {
        for (let k = -1; k <= 1; k++) pieces.push(rect((k + s) * pw, row * ph, pw, ph, shadeAt(k + 3 * row, row)))
      })
      return { w: pw, h: 4 * ph, pieces: pieces.filter((r) => intersects(r, pw, 4 * ph)), angle: rot }
    }
    case 'basket': {
      const n = Math.max(1, Math.round(L / W))
      const S = L + j
      const pitch = S / n
      const pieces: PieceRect[] = []
      for (let cx = 0; cx < 2; cx++) {
        for (let cy = 0; cy < 2; cy++) {
          const horizontal = (cx + cy) % 2 === 0
          for (let k = 0; k < n; k++) {
            const shade = shadeAt(cx * 7 + k, cy * 5 + k)
            pieces.push(horizontal ? rect(cx * S, cy * S + k * pitch, S, pitch, shade) : rect(cx * S + k * pitch, cy * S, pitch, S, shade))
          }
        }
      }
      return { w: 2 * S, h: 2 * S, pieces, angle: rot }
    }
    case 'herringbone': {
      // Rede de vetores (p, p) e (Lp, −Lp): em cada ponto, uma peça deitada e uma em pé encostada na ponta dela.
      const n = Math.max(1, Math.round(L / W))
      const Lp = L + j
      const p = Lp / n
      const T = 2 * Lp
      const pieces: PieceRect[] = []
      const range = 2 * n + 4
      for (let a = -range; a <= range; a++) {
        for (let b = -4; b <= 4; b++) {
          const ox = a * p + b * Lp
          const oy = a * p - b * Lp
          const lying = rect(ox, oy, Lp, p, shadeAt(a, b))
          const standing = rect(ox + Lp, oy + p - Lp, p, Lp, shadeAt(a + 31, b + 17))
          if (intersects(lying, T, T)) pieces.push(lying)
          if (intersects(standing, T, T)) pieces.push(standing)
        }
      }
      return { w: T, h: T, pieces, angle: rot + 45 }
    }
  }
}

/** Menor medida de peça visível: abaixo de poucos pixels, o desenho vira ruído e o piso é pintado liso. */
export const minPieceSize = (spec: PatternSpec): number => Math.min(spec.width, spec.length)

/** Clareia (amount > 0) ou escurece (amount < 0) uma cor #rrggbb. */
export function shadeColor(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const ch = (shift: number) => {
    const c = (n >> shift) & 255
    const v = amount >= 0 ? c + (255 - c) * amount : c * (1 + amount)
    return Math.max(0, Math.min(255, Math.round(v)))
  }
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`
}

/** Cor da junta: rejunte claro em pisos escuros e mais escuro em pisos claros. */
export function jointColor(hex: string): string {
  const n = Number.parseInt(hex.slice(1), 16)
  const lum = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11) / 255
  return lum > 0.55 ? shadeColor(hex, -0.28) : shadeColor(hex, -0.45)
}
