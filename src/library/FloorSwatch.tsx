import { useId } from 'react'
import { floorTile, jointColor, shadeColor } from '../model/floorPattern'
import type { RoomFloor } from '../model/types'
import { getFloor, MATERIAL_VARIATION } from './floors'

/**
 * Amostra do piso, desenhada com a mesma geometria da planta e do 3D (um ladrilho repetido em SVG).
 * Mostra um quadrado com algumas peças, em escala.
 */
export function FloorSwatch({ floor, size = 64 }: { floor: Omit<RoomFloor, 'id' | 'x' | 'y'>; size?: number }) {
  const id = useId().replace(/:/g, '')
  const tile = floorTile(floor)
  const variation = MATERIAL_VARIATION[getFloor(floor.componentId).material]
  // Uns 4 comprimentos de peça na amostra (no mínimo 60 cm, no máximo 2,4 m).
  const side = Math.min(240, Math.max(60, Math.max(floor.width, floor.length) * 2.2))
  const gap = floor.joint > 0 ? 0 : side / size / 2
  return (
    <svg width={size} height={size} viewBox={`0 0 ${side} ${side}`} aria-hidden="true" className="floor-swatch">
      <defs>
        <pattern id={id} width={tile.w} height={tile.h} patternUnits="userSpaceOnUse" patternTransform={`rotate(${tile.angle})`}>
          <rect width={tile.w} height={tile.h} fill={floor.joint > 0 ? jointColor(floor.color) : shadeColor(floor.color, -0.35)} />
          {tile.pieces.map((r, i) => (
            <rect key={i} x={r.x + gap / 2} y={r.y + gap / 2} width={Math.max(0, r.w - gap)} height={Math.max(0, r.h - gap)} fill={shadeColor(floor.color, r.shade * variation)} />
          ))}
        </pattern>
      </defs>
      <rect width={side} height={side} fill={`url(#${id})`} rx={side / 24} />
    </svg>
  )
}
