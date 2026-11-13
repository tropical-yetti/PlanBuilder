import type { ComponentDef, Prim } from './types'

const STROKE = '#1f2937'
const FILL = { leaf: '#ffffff', glass: '#dbeafe' }

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
  if (p.t === 'line') {
    const pts = []
    for (let i = 0; i < p.pts.length; i += 2) pts.push(`${p.pts[i]},${p.pts[i + 1]}`)
    return <polyline points={pts.join(' ')} fill="none" stroke={STROKE} strokeWidth={sw} strokeDasharray={dash} />
  }
  if (p.t === 'arc') return <path d={arcPath(p)} fill="none" stroke={STROKE} strokeWidth={sw} strokeDasharray={dash} />
  return <rect x={p.x} y={p.y} width={p.w} height={p.h} fill={p.fill ? FILL[p.fill] : 'none'} stroke={STROKE} strokeWidth={sw} />
}

/**
 * Miniatura do componente: um trecho de parede com o vão e o símbolo de planta.
 * Usa o mesmo `symbol()` do editor, então a biblioteca e a planta nunca ficam diferentes.
 */
export function SymbolSvg({ def, size = 72 }: { def: ComponentDef; size?: number }) {
  const t = 15
  const w = def.defaults.width
  const stub = Math.max(12, w * 0.15)
  const prims = def.symbol({ width: w, thickness: t, params: def.defaults.params })

  // Enquadra o desenho: a parede com o vão mais o que o símbolo ocupa para fora dela.
  let minY = -t / 2
  let maxY = t / 2
  let maxX = w / 2 + stub
  for (const p of prims) {
    if (p.t === 'line') {
      for (let i = 0; i < p.pts.length; i += 2) {
        maxX = Math.max(maxX, p.pts[i]!)
        minY = Math.min(minY, p.pts[i + 1]!)
        maxY = Math.max(maxY, p.pts[i + 1]!)
      }
    } else if (p.t === 'arc') {
      maxY = Math.max(maxY, p.cy + p.r)
    } else {
      maxX = Math.max(maxX, p.x + p.w)
      minY = Math.min(minY, p.y)
      maxY = Math.max(maxY, p.y + p.h)
    }
  }
  const minX = -w / 2 - stub
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
      <rect x={minX} y={-t / 2} width={stub} height={t} fill="#4b5563" />
      <rect x={w / 2} y={-t / 2} width={stub} height={t} fill="#4b5563" />
      {prims.map((p, i) => (
        <PrimSvg key={i} p={p} px={px} />
      ))}
    </svg>
  )
}
