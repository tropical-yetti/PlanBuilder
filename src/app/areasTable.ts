import { getComponent, getItem } from '../library/registry'
import type { Quantities } from '../model/quantities'

const n2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false })
const m2 = (cm2: number) => n2.format(cm2 / 10000)
const m = (cm: number) => n2.format(cm / 100)

/**
 * Quadro de áreas como texto separado por tabulação, para colar em planilhas
 * (números com vírgula decimal e sem unidade, para a planilha reconhecer como número).
 */
export function areasAsTsv(q: Quantities): string {
  const rows: (string | number)[][] = [
    ['Cômodo', 'Área (m²)', 'Perímetro (m)', 'Área de parede (m²)'],
    ...q.rooms.map((r) => [r.name, m2(r.area), m(r.perimeter), m2(r.wallArea)]),
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
  if (q.openingCounts.length > 0) {
    rows.push([], ['Portas e janelas', 'Quantidade'])
    for (const c of q.openingCounts) rows.push([getComponent(c.componentId).name, c.count])
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
