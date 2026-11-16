import { useState } from 'react'
import { FloorSwatch } from '../library/FloorSwatch'
import { FLOORS, getFloor, MATERIAL_LABELS, PATTERN_LABELS, wasteOf } from '../library/floors'
import { setRoomFloor, specFromDef, updateRoomFloor, type FloorSpec } from '../model/floors'
import type { Room } from '../model/quantities'
import { renameRoom, ROOM_NAME_SUGGESTIONS } from '../model/roomNames'
import { formatArea, formatCmValue, formatMeters } from '../model/units'
import { useProjectStore } from '../store/projectStore'
import { NumberField } from '../ui/NumberField'

const GROUPS = [...new Set(FLOORS.map((f) => f.group))]
const int = new Intl.NumberFormat('pt-BR')

function FloorSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  return (
    <label className="field">
      <span className="field-label">Piso</span>
      <select className="field-select" value={value} onChange={(e) => onChange(e.target.value)} aria-label="Piso do cômodo">
        <option value="">Sem piso</option>
        {GROUPS.map((g) => (
          <optgroup key={g} label={g}>
            {FLOORS.filter((f) => f.group === g).map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  )
}

/** Painel do cômodo selecionado: nome, áreas e piso (docs/PLANO.md, seção 11.1). */
export function RoomProperties({ room }: { room: Room }) {
  const update = useProjectStore((s) => s.update)
  const [name, setName] = useState<string | null>(null)
  const floor = room.floor
  const def = floor ? getFloor(floor.componentId) : null

  const setFloor = (label: string, spec: FloorSpec | null) => update(label, (d) => setRoomFloor(d, room, spec))
  const patch = (label: string, p: Partial<FloorSpec>) => update(label, (d) => updateRoomFloor(d, room, p))

  function commitName() {
    if (name !== null && name.trim() !== (room.named ? room.name : '')) update('Cômodo renomeado', (d) => renameRoom(d, room, name))
    setName(null)
  }

  const summary = floor
    ? (() => {
        const waste = wasteOf(floor.pattern)
        const withWaste = room.area * (1 + waste)
        return { waste, withWaste, pieces: Math.ceil(withWaste / (floor.width * floor.length) - 1e-9) }
      })()
    : null

  return (
    <div className="props room-props">
      <h3 className="props-title">Cômodo</h3>
      <label className="field">
        <span className="field-label">Nome</span>
        <input
          className="field-select"
          value={name ?? (room.named ? room.name : '')}
          placeholder={room.name}
          list="room-name-suggestions-props"
          aria-label="Nome do cômodo"
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur()
            else if (e.key === 'Escape') {
              setName(null)
              e.currentTarget.blur()
            }
          }}
        />
        <datalist id="room-name-suggestions-props">
          {ROOM_NAME_SUGGESTIONS.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
      </label>
      <div className="area-row">
        <span>Área</span>
        <span className="num">{formatArea(room.area)}</span>
      </div>
      <div className="area-row" title="Perímetro interno (rodapé)">
        <span>Perímetro</span>
        <span className="num">{formatMeters(room.perimeter)}</span>
      </div>
      <div className="area-row" title="Superfície das paredes voltadas para o cômodo, descontando portas e janelas">
        <span>Paredes</span>
        <span className="num">{formatArea(room.wallArea)}</span>
      </div>

      <h4 className="props-subtitle">Piso</h4>
      <FloorSelect
        value={floor?.componentId ?? ''}
        onChange={(id) => {
          if (!id) setFloor('Piso removido', null)
          else setFloor(floor ? 'Piso trocado' : 'Piso aplicado', { ...specFromDef(getFloor(id)), rotation: floor?.rotation ?? 0 })
        }}
      />
      {!floor && <p className="empty">Escolha um piso aqui ou arraste um da biblioteca (categoria Pisos) para o cômodo.</p>}

      {floor && def && summary && (
        <>
          <div className="floor-preview">
            <FloorSwatch floor={floor} size={56} />
            <span>
              {MATERIAL_LABELS[def.material]}
              <br />
              <span className="muted">
                {formatCmValue(floor.width)} × {formatCmValue(floor.length)} cm · {PATTERN_LABELS[floor.pattern].toLowerCase()}
              </span>
            </span>
          </div>

          <div className="preset-list" role="group" aria-label="Paginação">
            <span className="preset-label">Paginação</span>
            {def.patterns.map((pt) => (
              <button key={pt} type="button" className={`chip ${floor.pattern === pt ? 'active' : ''}`} aria-pressed={floor.pattern === pt} onClick={() => patch('Paginação alterada', { pattern: pt })}>
                {PATTERN_LABELS[pt]}
              </button>
            ))}
          </div>

          <div className="preset-list" role="group" aria-label="Tamanhos de peça">
            <span className="preset-label">Tamanhos comuns</span>
            {def.sizes.map((sz) => {
              const active = floor.width === sz.width && floor.length === sz.length
              return (
                <button key={`${sz.width}x${sz.length}`} type="button" className={`chip ${active ? 'active' : ''}`} aria-pressed={active} onClick={() => patch('Tamanho do piso alterado', { width: sz.width, length: sz.length })}>
                  {formatCmValue(sz.width)} × {formatCmValue(sz.length)}
                </button>
              )
            })}
          </div>
          <NumberField label="Largura da peça" value={floor.width} min={2} max={300} onCommit={(v) => patch('Tamanho do piso alterado', { width: v })} />
          <NumberField label="Comprimento" value={floor.length} min={2} max={300} onCommit={(v) => patch('Tamanho do piso alterado', { length: v })} />
          <NumberField label="Junta" value={floor.joint} min={0} max={2} title="Rejunte entre as peças" onCommit={(v) => patch('Junta alterada', { joint: v })} />

          <div className="preset-list" role="group" aria-label="Cor">
            <span className="preset-label">Cor</span>
            {def.colors.map((c) => (
              <button
                key={c.value}
                type="button"
                className={`swatch ${floor.color === c.value ? 'active' : ''}`}
                style={{ background: c.value }}
                title={c.label}
                aria-label={c.label}
                aria-pressed={floor.color === c.value}
                onClick={() => patch('Cor do piso alterada', { color: c.value })}
              />
            ))}
            <input type="color" className="swatch-input" value={floor.color} title="Outra cor" aria-label="Outra cor" onChange={(e) => patch('Cor do piso alterada', { color: e.target.value })} />
          </div>

          <div className="preset-list" role="group" aria-label="Direção">
            <span className="preset-label">Direção das peças</span>
            {[
              [0, 'Horizontal'],
              [90, 'Vertical'],
            ].map(([deg, label]) => (
              <button key={deg} type="button" className={`chip ${floor.rotation === deg ? 'active' : ''}`} aria-pressed={floor.rotation === deg} onClick={() => patch('Direção do piso alterada', { rotation: deg as number })}>
                {label}
              </button>
            ))}
          </div>

          <div className="area-row" title={`Área do cômodo mais ${Math.round(summary.waste * 100)}% de perda nos cortes`}>
            <span>Comprar (com {Math.round(summary.waste * 100)}% de perda)</span>
            <span className="num">{formatArea(summary.withWaste)}</span>
          </div>
          <div className="area-row" title="Estimativa de peças inteiras">
            <span>Peças</span>
            <span className="num">≈ {int.format(summary.pieces)}</span>
          </div>
          <div className="props-actions">
            <button type="button" className="btn outline danger" onClick={() => setFloor('Piso removido', null)}>
              Remover piso
            </button>
          </div>
        </>
      )}
    </div>
  )
}
