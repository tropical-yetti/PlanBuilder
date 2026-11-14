import type { Context } from 'konva/lib/Context'
import { Group, Shape } from 'react-konva'
import { getItem } from '../../library/registry'
import type { Id, Item } from '../../model/types'
import { drawPrims } from '../drawPrims'

export interface ItemGlyphProps {
  item: Pick<Item, 'componentId' | 'x' | 'y' | 'rotation' | 'width' | 'depth' | 'mirrored' | 'params'>
  pxPerCm: number
  color: string
  ghost?: boolean
}

/** Um móvel: o símbolo do componente, posicionado, girado e (se for o caso) espelhado. */
export function ItemGlyph({ item, pxPerCm, color, ghost }: ItemGlyphProps) {
  const def = getItem(item.componentId)
  const sceneFunc = (ctx: Context) => {
    drawPrims(ctx, def.symbol({ width: item.width, depth: item.depth, params: item.params }), 1 / pxPerCm, color)
  }
  return (
    <Group x={item.x} y={item.y} rotation={item.rotation} scaleX={item.mirrored ? -1 : 1} opacity={ghost ? 0.7 : 1}>
      <Shape sceneFunc={sceneFunc} />
    </Group>
  )
}

export function ItemLayer({ items, pxPerCm, colorOf }: { items: Item[]; pxPerCm: number; colorOf: (id: Id) => string }) {
  return (
    <Group listening={false}>
      {items.map((it) => (
        <ItemGlyph key={it.id} item={it} pxPerCm={pxPerCm} color={colorOf(it.id)} />
      ))}
    </Group>
  )
}
