import { FILL_COLORS, primBounds } from './prims'
import type { LibraryDef, Prim } from './types'

const STROKE = '#1f2937'

function arcPath(p: Extract<Prim, { t: 'arc' }>): string {
  const x0 = p.cx + p.r * Math.cos(p.a0)
  const y0 = p.cy + p.r * Math.sin(p.a0)
  const x1 = p.cx + p.r * Math.cos(p.a1)
  const y1 = p.cy + p.r * Math.sin(p.a1)
  const large = Math.abs(p.a1 - p.a0) > Math.PI ? 1 : 0
  const sweep = p.a1 > p.a0 ? 1 : 0
  return `M ${x0} ${y0} A ${p.r} ${p.r} 0 ${large} ${sweep} ${x1} ${y1}`
}

function PrimSvg({ p, px }: { p: Prim; px: number }) {
  const sw = (p.thin ? 1 : 1.5) * px
  const dash = 'dash' in p && p.dash ? `${4 * px} ${3 * px}` : undefined
  const fill = 'fill' in p && p.fill ? FILL_COLORS[p.fill] : 'none'
  if (p.t === 'line') {
    const pts = []
    for (let i = 0; i < p.pts.length; i += 2) pts.push(`${p.pts[i]},${p.pts[i + 1]}`)
    return p.closed ? (
      <polygon points={pts.join(' ')} fill={fill} stroke={STROKE} strokeWidth={sw} strokeDasharray={dash} />
    ) : (
      <polyline points={pts.join(' ')} fill="none" stroke={STROKE} strokeWidth={sw} strokeDasharray={dash} />
    )
  }
  if (p.t === 'arc') return <path d={arcPath(p)} fill="none" stroke={STROKE} strokeWidth={sw} strokeDasharray={dash} />
  if (p.t === 'circle') return <circle cx={p.cx} cy={p.cy} r={p.r} fill={fill} stroke={STROKE} strokeWidth={sw} />
  return <rect x={p.x} y={p.y} width={p.w} height={p.h} rx={p.r} fill={fill} stroke={STROKE} strokeWidth={sw} />
}

/**
 * Miniatura do componente, desenhada com o mesmo `symbol()` usado na planta: a biblioteca e a planta
 * nunca ficam diferentes. Aberturas aparecem num trecho de parede; móveis aparecem sozinhos.
 */
export function SymbolSvg({ def, size = 72 }: { def: LibraryDef; size?: number }) {
  const t = 15
  const isOpening = def.kind === 'opening'
  const w = def.defaults.width
  const stub = isOpening ? Math.max(12, w * 0.15) : 0
  const prims = isOpening
    ? def.symbol({ width: w, thickness: t, params: def.defaults.params })
    : def.symbol({ width: w, depth: def.defaults.depth, params: def.defaults.params })

  const b = primBounds(prims) ?? { minX: -w / 2, minY: -t / 2, maxX: w / 2, maxY: t / 2 }
  const minX = Math.min(b.minX, isOpening ? -w / 2 - stub : b.minX)
  const maxX = Math.max(b.maxX, isOpening ? w / 2 + stub : b.maxX)
  const minY = Math.min(b.minY, isOpening ? -t / 2 : b.minY)
  const maxY = Math.max(b.maxY, isOpening ? t / 2 : b.maxY)
  const pad = 4
  const vbW = maxX - minX + 2 * pad
  const vbH = maxY - minY + 2 * pad
  const side = Math.max(vbW, vbH)
  const px = side / size // quantos cm vale 1 pixel da miniatura

  return (
    <svg
      width={size}
      height={size}
      viewBox={`${minX - pad - (side - vbW) / 2} ${minY - pad - (side - vbH) / 2} ${side} ${side}`}
      aria-hidden="true"
    >
      {isOpening && (
        <>
          <rect x={-w / 2 - stub} y={-t / 2} width={stub} height={t} fill="#4b5563" />
          <rect x={w / 2} y={-t / 2} width={stub} height={t} fill="#4b5563" />
        </>
      )}
      {prims.map((p, i) => (
        <PrimSvg key={i} p={p} px={px} />
      ))}
    </svg>
  )
}
