import { Layer, Line } from 'react-konva'
import type { WallPolygon } from '../../model/wallGeometry'
import type { Id, WallKind } from '../../model/types'
import { C } from '../theme'

interface Props {
  polygons: WallPolygon[]
  selected: Set<Id>
  hovered: Id | null
  hoverColor: string
  /** Paredes bloqueadas: desenhadas mais claras, para se distinguir das editáveis. */
  locked: Set<Id>
  /** Tipo de cada parede (alvenaria fica fora do mapa): define o preenchimento. */
  kinds?: Map<Id, WallKind>
}

const flat = (w: WallPolygon) => w.points.flatMap((p) => [p.x, p.y])

/**
 * Paredes: primeiro o contorno de todas, depois o preenchimento por cima.
 * Assim as emendas entre paredes ligadas somem e só o contorno externo aparece.
 */
export function WallLayer({ polygons, selected, hovered, hoverColor, locked, kinds }: Props) {
  const base = (id: Id) => {
    const kind = kinds?.get(id)
    // alvenaria escura; divisória mais clara; painel bem claro, para não parecer parede estrutural
    return kind === 'panel' ? C.panelFill : kind === 'partition' ? C.partitionFill : C.wallFill
  }
  return (
    <Layer listening={false}>
      {polygons.map((w) => (
        <Line key={`o-${w.wallId}`} points={flat(w)} closed stroke={C.wallStroke} strokeWidth={3} strokeScaleEnabled={false} lineJoin="round" />
      ))}
      {polygons.map((w) => {
        const color = selected.has(w.wallId) ? C.wallSelected : hovered === w.wallId ? hoverColor : locked.has(w.wallId) ? C.wallLocked : base(w.wallId)
        // O traço fino da mesma cor cobre a emenda (antialiasing) entre paredes vizinhas.
        return <Line key={`f-${w.wallId}`} points={flat(w)} closed fill={color} stroke={color} strokeWidth={1} strokeScaleEnabled={false} lineJoin="round" />
      })}
    </Layer>
  )
}
