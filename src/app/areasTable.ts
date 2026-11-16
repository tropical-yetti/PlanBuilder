import { getComponent, getItem } from '../library/registry'
import { getFloor, PATTERN_LABELS } from '../library/floors'
import type { Quantities } from '../model/quantities'

const n2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
const m2 = (cm2: number) => n2.format(cm2 / 10000)
const m = (cm: number) => n2.format(cm / 100)
const n1 = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1, useGrouping: false })

/**
 * Quadro de áreas como texto separado por tabulação, para colar em planilhas
 * (números com vírgula decimal e sem unidade, para a planilha reconhecer como número).
 */
export function areasAsTsv(q: Quantities): string {
  // A coluna de piso só aparece quando algum cômodo tem piso.
  const floorCol = q.floors.length > 0
  const rows: (string | number)[][] = [
    ['Cômodo', 'Área (m²)', 'Perímetro (m)', 'Área de parede (m²)', ...(floorCol ? ['Piso'] : [])],
    ...q.rooms.map((r) => [r.name, m2(r.area), m(r.perimeter), m2(r.wallArea), ...(floorCol ? [r.floor ? getFloor(r.floor.componentId).name : ''] : [])]),
    [],
    ['Resumo', 'Valor'],
    ['Área total construída (m²)', m2(q.totalArea)],
    ['Área útil (m²)', m2(q.usefulArea)],
    ['Área de paredes em planta (m²)', m2(q.wallPlanArea)],
    ['Superfície de paredes internas (m²)', m2(q.wallSurface.internal)],
    ['Superfície de paredes externas (m²)', m2(q.wallSurface.external)],
    ['Perímetro externo (m)', m(q.externalPerimeter)],
    ['Comprimento de paredes (m)', m(q.wallLength)],
    ['Área de vãos (m²)', m2(q.openingsArea)],
  ]
  if (q.floors.length > 0) {
    rows.push([], ['Pisos', 'Peça (cm)', 'Paginação', 'Área (m²)', 'Perda', 'Área com perda (m²)', 'Peças (estimativa)', 'Cômodos'])
    for (const f of q.floors) {
      rows.push([f.name, `${n1.format(f.width)} × ${n1.format(f.length)}`, PATTERN_LABELS[f.pattern], m2(f.area), `${Math.round(f.waste * 100)}%`, m2(f.areaWithWaste), f.pieces, f.rooms.join(', ')])
    }
  }
  if (q.openingCounts.length > 0) {
    rows.push([], ['Portas e janelas', 'Quantidade'])
    for (const c of q.openingCounts) rows.push([getComponent(c.componentId).name, c.count])
  }
  if (q.partitions.length > 0 || q.panels.count > 0) {
    rows.push([], ['Divisórias e painéis', 'Comprimento (m)', 'Área (m²)'])
    if (q.partitions.length > 0) rows.push(['Divisórias (drywall)', m(q.partitions.length), m2(q.partitions.area)])
    if (q.panels.count > 0) rows.push(['Painéis', m(q.panels.length), m2(q.panels.area)])
  }
  if (q.cobogo.area > 0) {
    rows.push([], ['Cobogó', 'Valor'], ['Área de cobogó (m²)', m2(q.cobogo.area)], ['Peças (estimativa)', q.cobogo.pieces])
  }
  if (q.itemCounts.length > 0) {
    rows.push([], ['Móveis', 'Quantidade'])
    for (const c of q.itemCounts) rows.push([getItem(c.componentId).name, c.count])
  }
  return rows.map((r) => r.join('\t')).join('\n')
}
