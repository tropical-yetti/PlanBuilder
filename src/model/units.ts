/**
 * Leitura e exibição de medidas. Internamente tudo é em centímetros.
 * Aceita: "350", "350cm", "3,5m", "3.5 m", "35mm".
 */
export function parseLength(input: string): number | null {
  const s = input.trim().toLowerCase().replace(/\s+/g, '').replace(',', '.')
  const m = /^(\d+(?:\.\d+)?|\.\d+)(mm|cm|m)?$/.exec(s)
  if (!m) return null
  const v = Number(m[1])
  if (!Number.isFinite(v)) return null
  const unit = m[2] ?? 'cm'
  const cm = unit === 'm' ? v * 100 : unit === 'mm' ? v / 10 : v
  return Math.round(cm * 100) / 100
}

/** Lê "400x300" (ou "4m x 3m", "400*300") como largura × profundidade em cm. */
export function parseSize(input: string): { w: number; h: number } | null {
  const parts = input.toLowerCase().split(/[x×*]/)
  if (parts.length !== 2) return null
  const w = parseLength(parts[0]!)
  const h = parseLength(parts[1]!)
  return w && h ? { w, h } : null
}

const nf2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

/** "3,50 m" */
export const formatMeters = (cm: number): string => `${nf2.format(cm / 100)} m`

/** "350 cm" (com até uma casa decimal) */
export const formatCm = (cm: number): string => `${nf0.format(cm)} cm`

/** Número em cm para campos de formulário: "350" ou "352,5". */
export const formatCmValue = (cm: number): string => nf0.format(Math.round(cm * 10) / 10).replace(/\./g, '')

const nfArea = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/** Área em cm² exibida como "12,35 m²". */
export const formatArea = (cm2: number): string => `${nfArea.format(cm2 / 10000)} m²`
