import type Konva from 'konva'
import { createRoot } from 'react-dom/client'
import { quantities, type Quantities } from '../model/quantities'
import { formatArea, formatMeters } from '../model/units'
import type { Project } from '../model/types'
import { ExportDrawing } from './ExportDrawing'
import { exportLayout, safePixelRatio, type ExportOptions } from './exportLayout'

const ROW = 22
const TABLE_PAD = 24

function tableRows(project: Project, q: Quantities): { label: string; value: string; strong?: boolean; gap?: boolean }[] {
  return [
    { label: project.name, value: '', strong: true },
    ...q.rooms.map((r) => ({ label: r.name, value: formatArea(r.area) })),
    { label: 'Área útil', value: formatArea(q.usefulArea), strong: true, gap: q.rooms.length > 0 },
    { label: 'Área total (com paredes)', value: formatArea(q.totalArea), strong: true },
    { label: 'Superfície de paredes', value: formatArea(q.wallSurface.internal + q.wallSurface.external) },
    { label: 'Perímetro externo', value: formatMeters(q.externalPerimeter) },
  ]
}

function drawTable(ctx: CanvasRenderingContext2D, rows: ReturnType<typeof tableRows>, top: number, width: number) {
  const right = Math.min(width - TABLE_PAD, TABLE_PAD + 360)
  ctx.strokeStyle = '#d1d5db'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(TABLE_PAD, top + 0.5)
  ctx.lineTo(width - TABLE_PAD, top + 0.5)
  ctx.stroke()
  let y = top + TABLE_PAD
  ctx.textBaseline = 'middle'
  for (const [i, row] of rows.entries()) {
    if (row.gap) y += 8
    ctx.font = `${row.strong ? '600 ' : ''}${i === 0 ? 16 : 13}px system-ui, sans-serif`
    ctx.fillStyle = row.strong ? '#111827' : '#374151'
    ctx.textAlign = 'left'
    ctx.fillText(row.label, TABLE_PAD, y + ROW / 2)
    ctx.textAlign = 'right'
    ctx.fillText(row.value, right, y + ROW / 2)
    y += i === 0 ? ROW + 6 : ROW
  }
}

const tableHeight = (rows: ReturnType<typeof tableRows>): number => 2 * TABLE_PAD + rows.length * ROW + 6 + (rows.some((r) => r.gap) ? 8 : 0)

const nextFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))

/**
 * Gera o PNG da planta. O desenho é montado fora da tela com as mesmas camadas do editor
 * (então a imagem é idêntica à planta), sobre fundo branco e sem seleção nem prévias.
 */
export async function renderPng(project: Project, options: ExportOptions): Promise<Blob> {
  const layout = exportLayout(project)
  if (!layout) throw new Error('Não há nada para exportar.')

  const rows = options.areaTable ? tableRows(project, quantities(project)) : []
  const extra = options.areaTable ? tableHeight(rows) : 0
  const ratio = safePixelRatio(options.pixelRatio, layout.width, layout.height + extra)

  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-100000px;top:0;pointer-events:none;'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    let stage: Konva.Stage | null = null
    root.render(<ExportDrawing project={project} layout={layout} options={options} onStage={(s) => (stage = s)} />)
    // Espera o React montar o desenho e o Konva pintar (os rótulos se centralizam depois de medidos).
    for (let i = 0; i < 20 && !stage; i++) await nextFrame()
    await nextFrame()
    await nextFrame()
    const ready = stage as Konva.Stage | null
    if (!ready) throw new Error('Não foi possível montar a imagem.')
    ready.draw()
    const drawing = ready.toCanvas({ pixelRatio: ratio })

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(layout.width * ratio)
    canvas.height = Math.round((layout.height + extra) * ratio)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Não foi possível criar a imagem.')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(drawing, 0, 0)
    if (options.areaTable) {
      ctx.scale(ratio, ratio)
      drawTable(ctx, rows, layout.height, layout.width)
    }
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Não foi possível gerar o PNG.'))), 'image/png'))
  } finally {
    root.unmount()
    host.remove()
  }
}
