import { useState } from 'react'
import { useInteractionStore } from '../editor2d/interactionStore'
import { getComponent, getItem } from '../library/registry'
import { quantities, type Room } from '../model/quantities'
import { ROOM_NAME_SUGGESTIONS, renameRoom } from '../model/roomNames'
import { formatArea, formatMeters } from '../model/units'
import { useProjectStore } from '../store/projectStore'
import { areasAsTsv } from './areasTable'

function Row({ label, value, title, strong }: { label: string; value: string; title?: string; strong?: boolean }) {
  return (
    <div className={`area-row ${strong ? 'strong' : ''}`} title={title}>
      <span>{label}</span>
      <span className="num">{value}</span>
    </div>
  )
}

function RoomRow({ room }: { room: Room }) {
  const update = useProjectStore((s) => s.update)
  const setUi = useInteractionStore((s) => s.set)
  const [text, setText] = useState<string | null>(null)

  function commit() {
    if (text !== null && text.trim() !== (room.named ? room.name : '')) {
      update('Cômodo renomeado', (d) => renameRoom(d, room, text))
    }
    setText(null)
  }

  return (
    <tr onPointerEnter={() => setUi({ highlightRoom: room.key })} onPointerLeave={() => setUi({ highlightRoom: null })}>
      <td>
        <input
          className={`room-name ${room.named ? '' : 'auto'}`}
          value={text ?? (room.named ? room.name : '')}
          placeholder={room.name}
          list="room-name-suggestions-panel"
          aria-label={`Nome de ${room.name}`}
          title="Clique para dar um nome ao cômodo"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            else if (e.key === 'Escape') {
              setText(null)
              e.currentTarget.blur()
            }
          }}
        />
      </td>
      <td className="num">{formatArea(room.area)}</td>
      <td className="num" title="Perímetro interno (rodapé)">
        {formatMeters(room.perimeter)}
      </td>
      <td className="num" title="Superfície das paredes voltadas para o cômodo, descontando portas e janelas">
        {formatArea(room.wallArea)}
      </td>
    </tr>
  )
}

/** Painel "Áreas": resumo da planta e tabela por cômodo (docs/PLANO.md, seção 7). */
export function AreasPanel() {
  const project = useProjectStore((s) => s.project)
  const q = quantities(project)
  const [copied, setCopied] = useState<'ok' | 'error' | null>(null)

  async function copy() {
    try {
      await navigator.clipboard.writeText(areasAsTsv(q))
      setCopied('ok')
    } catch {
      setCopied('error')
    }
    setTimeout(() => setCopied(null), 2500)
  }

  if (Object.keys(project.walls).length === 0) {
    return <p className="empty">Desenhe cômodos fechados para ver a área total, a área útil e a área de paredes.</p>
  }

  const doors = q.openingCounts.filter((c) => getComponent(c.componentId).category === 'doors')
  const windows = q.openingCounts.filter((c) => getComponent(c.componentId).category === 'windows')
  const cobogos = q.openingCounts.filter((c) => getComponent(c.componentId).category === 'cobogo')
  const sum = (list: typeof doors) => list.reduce((s, c) => s + c.count, 0)

  return (
    <div className="areas">
      <section>
        <h3 className="props-subtitle">Planta</h3>
        <Row strong label="Área total" value={formatArea(q.totalArea)} title="Área construída: contorno externo, incluindo as paredes" />
        <Row strong label="Área útil" value={formatArea(q.usefulArea)} title="Soma das áreas internas dos cômodos, até a face das paredes" />
        <Row label="Paredes em planta" value={formatArea(q.wallPlanArea)} title="Área do piso ocupada pelas paredes (total − útil)" />
        <Row label="Perímetro externo" value={formatMeters(q.externalPerimeter)} />
      </section>

      <section>
        <h3 className="props-subtitle">Superfície de paredes</h3>
        <Row
          strong
          label="Total"
          value={formatArea(q.wallSurface.internal + q.wallSurface.external)}
          title="Comprimento de cada face × altura, descontando portas e janelas. Útil para pintura e revestimento"
        />
        <Row label="Faces internas" value={formatArea(q.wallSurface.internal)} title="Faces voltadas para dentro de um cômodo" />
        <Row label="Faces externas" value={formatArea(q.wallSurface.external)} title="Faces voltadas para fora" />
        <Row label="Vãos descontados" value={formatArea(q.openingsArea)} title="Área de portas e janelas (descontada de cada face)" />
        <Row label="Comprimento de paredes" value={formatMeters(q.wallLength)} title="Soma dos comprimentos pelo eixo" />
      </section>

      <section>
        <h3 className="props-subtitle">Cômodos ({q.rooms.length})</h3>
        {q.rooms.length === 0 ? (
          <p className="empty">Nenhum cômodo fechado ainda. Um cômodo aparece quando as paredes fecham um contorno.</p>
        ) : (
          <table className="rooms-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th className="num">Área</th>
                <th className="num">Perím.</th>
                <th className="num">Paredes</th>
              </tr>
            </thead>
            <tbody>
              {q.rooms.map((r) => (
                <RoomRow key={r.key} room={r} />
              ))}
            </tbody>
          </table>
        )}
      </section>

      {q.openingCounts.length > 0 && (
        <section>
          <h3 className="props-subtitle">Portas, janelas e cobogós</h3>
          {doors.length > 0 && <Row strong label="Portas" value={String(sum(doors))} />}
          {doors.map((c) => (
            <Row key={c.componentId} label={getComponent(c.componentId).name} value={String(c.count)} />
          ))}
          {windows.length > 0 && <Row strong label="Janelas" value={String(sum(windows))} />}
          {windows.map((c) => (
            <Row key={c.componentId} label={getComponent(c.componentId).name} value={String(c.count)} />
          ))}
          {cobogos.length > 0 && (
            <>
              <Row strong label="Cobogó" value={formatArea(q.cobogo.area)} title="Área de todos os cobogós (descontada da superfície de paredes)" />
              <Row
                label="Peças (estimativa)"
                value={`≈ ${q.cobogo.pieces}`}
                title="Peças cortadas nas bordas contam como inteiras. Considere uma sobra para quebras."
              />
            </>
          )}
        </section>
      )}

      {q.itemCounts.length > 0 && (
        <section>
          <h3 className="props-subtitle">Móveis</h3>
          {q.itemCounts.map((c) => (
            <Row key={c.componentId} label={getItem(c.componentId).name} value={String(c.count)} />
          ))}
        </section>
      )}

      <button type="button" className="btn outline" onClick={copy} title="Copia o quadro de áreas para colar numa planilha">
        {copied === 'ok' ? 'Copiado!' : copied === 'error' ? 'Não foi possível copiar' : 'Copiar tabela'}
      </button>

      <datalist id="room-name-suggestions-panel">
        {ROOM_NAME_SUGGESTIONS.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
    </div>
  )
}
