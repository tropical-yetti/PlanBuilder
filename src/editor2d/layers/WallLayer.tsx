import { Layer, Line } from 'react-konva'
import type { WallPolygon } from '../../model/wallGeometry'
import type { Id } from '../../model/types'
import { C } from '../theme'

interface Props {
  polygons: WallPolygon[]
  selected: Set<Id>
  hovered: Id | null
  hoverColor: string
}

const flat = (w: WallPolygon) => w.points.flatMap((p) => [p.x, p.y])

/**
 * Paredes: primeiro o contorno de todas, depois o preenchimento por cima.
 * Assim as emendas entre paredes ligadas somem e só o contorno externo aparece.
 */
export function WallLayer({ polygons, selected, hovered, hoverColor }: Props) {
  return (
    <Layer listening={false}>
      {polygons.map((w) => (
        <Line key={`o-${w.wallId}`} points={flat(w)} closed stroke={C.wallStroke} strokeWidth={3} strokeScaleEnabled={false} lineJoin="round" />
      ))}
      {polygons.map((w) => {
        const color = selected.has(w.wallId) ? C.wallSelected : hovered === w.wallId ? hoverColor : C.wallFill
        // O traço fino da mesma cor cobre a emenda (antialiasing) entre paredes vizinhas.
        return <Line key={`f-${w.wallId}`} points={flat(w)} closed fill={color} stroke={color} strokeWidth={1} strokeScaleEnabled={false} lineJoin="round" />
      })}
    </Layer>
  )
}
