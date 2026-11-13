import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { commands, type CommandCategory } from '../commands/registry'
import { formatShortcut, isMacPlatform } from '../commands/shortcuts'
import { normalizeText } from '../library/registry'
import { parseLength } from '../model/units'
import { useEditorStore, type Dialog } from '../store/editorStore'

const isMac = isMacPlatform()
const close = () => useEditorStore.getState().setDialog(null)
const CATEGORY_ORDER: CommandCategory[] = ['Arquivo', 'Editar', 'Ferramentas', 'Exibir']
/** Comandos que só fazem sentido no menu de contexto (dependem de onde se clicou). */
const CONTEXT_ONLY = new Set(['edit.pasteHere', 'room.rename', 'room.selectWalls', 'wall.splitHere', 'edit.unlock'])

function Modal({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        close()
      }
    }
    window.addEventListener('keydown', onKey, { capture: true })
    return () => window.removeEventListener('keydown', onKey, { capture: true })
  }, [])
  return (
    <div className="modal-backdrop" onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        {children}
      </div>
    </div>
  )
}

/** Paleta de comandos (Ctrl+K): busca qualquer ação pelo nome. */
function Palette() {
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const words = normalizeText(query).split(/\s+/).filter(Boolean)
    return commands
      .list()
      .filter((c) => !CONTEXT_ONLY.has(c.id) && c.id !== 'app.palette')
      .filter((c) => {
        const hay = normalizeText(`${c.label} ${c.category} ${c.description ?? ''}`)
        return words.every((w) => hay.includes(w))
      })
      .map((c) => ({ cmd: c, enabled: commands.isEnabled(c.id) }))
      .sort((a, b) => Number(b.enabled) - Number(a.enabled))
  }, [query])
  const active = Math.min(index, Math.max(0, results.length - 1))

  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
  }, [active])

  function run(i: number) {
    const r = results[i]
    if (!r?.enabled) return
    close()
    commands.execute(r.cmd.id)
  }

  return (
    <Modal title="Paleta de comandos">
      <input
        className="palette-input"
        autoFocus
        placeholder="O que você quer fazer? Ex.: espelhar, alinhar, grade…"
        value={query}
        aria-label="Buscar comando"
        onChange={(e) => {
          setQuery(e.target.value)
          setIndex(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setIndex(Math.min(active + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setIndex(Math.max(active - 1, 0))
          } else if (e.key === 'Enter') {
            run(active)
          }
        }}
      />
      <div className="palette-list" ref={listRef} role="listbox">
        {results.length === 0 && <p className="empty">Nenhum comando encontrado.</p>}
        {results.map(({ cmd, enabled }, i) => {
          const shortcut = cmd.shortcuts[0] ?? cmd.hint
          return (
            <button
              key={cmd.id}
              type="button"
              role="option"
              aria-selected={i === active}
              className={`palette-item ${i === active ? 'active' : ''}`}
              disabled={!enabled}
              title={cmd.description}
              onPointerMove={() => setIndex(i)}
              onClick={() => run(i)}
            >
              <span className="palette-cat">{cmd.category}</span>
              <span className="palette-label">{cmd.label}</span>
              {shortcut && <kbd>{formatShortcut(shortcut, isMac)}</kbd>}
            </button>
          )
        })}
      </div>
    </Modal>
  )
}

/** Lista de atalhos (?), gerada a partir do registro de comandos. */
function Shortcuts() {
  const groups = CATEGORY_ORDER.map((category) => ({
    category,
    items: commands.list().filter((c) => c.category === category && (c.shortcuts.length > 0 || c.hint)),
  }))
  const extras: [string, string][] = [
    ['Espaço + arrastar', 'Mover a vista'],
    ['Roda do mouse', 'Zoom no cursor'],
    ['Shift (desenhando)', 'Trava o ângulo em passos de 15°'],
    ['Alt (desenhando ou arrastando)', 'Desliga os snaps'],
    ['Shift + clique', 'Adiciona ou remove da seleção'],
    ['Duplo clique', 'Parede: insere um nó · Texto: edita · Cômodo: dá nome'],
    ['Botão direito', 'Menu com as ações do objeto'],
  ]
  return (
    <Modal title="Atalhos de teclado" wide>
      <div className="modal-head">
        <h2>Atalhos de teclado</h2>
        <button type="button" className="btn" onClick={close} aria-label="Fechar">
          ✕
        </button>
      </div>
      <div className="shortcuts">
        {groups.map((g) => (
          <section key={g.category}>
            <h3>{g.category}</h3>
            {g.items.map((c) => (
              <div key={c.id} className="shortcut-row">
                <span>{c.label}</span>
                <span className="keys">
                  {[...c.shortcuts, ...(c.hint ? [c.hint] : [])].map((s) => (
                    <kbd key={s}>{formatShortcut(s, isMac)}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </section>
        ))}
        <section>
          <h3>Mouse e teclas de apoio</h3>
          {extras.map(([keys, label]) => (
            <div key={keys} className="shortcut-row">
              <span>{label}</span>
              <span className="keys">
                <kbd>{keys}</kbd>
              </span>
            </div>
          ))}
        </section>
      </div>
    </Modal>
  )
}

function Prompt({ dialog }: { dialog: Extract<Dialog, { kind: 'prompt' }> }) {
  const [text, setText] = useState(dialog.initial)
  const [invalid, setInvalid] = useState(false)

  function submit() {
    // Medidas aceitam "350", "3,5m"…; ângulos aceitam número com sinal.
    const value = dialog.suffix === 'cm' ? parseLength(text) : Number(text.trim().replace(',', '.'))
    if (value === null || !Number.isFinite(value) || text.trim() === '') {
      setInvalid(true)
      return
    }
    close()
    dialog.onSubmit(value)
  }

  return (
    <Modal title={dialog.title}>
      <form
        className="prompt"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <h2>{dialog.title}</h2>
        <label className={`field ${invalid ? 'invalid' : ''}`}>
          <span className="field-label">{dialog.label}</span>
          <span className="field-input">
            <input autoFocus value={text} onChange={(e) => setText(e.target.value)} onFocus={(e) => e.target.select()} inputMode="decimal" />
            {dialog.suffix && <span className="field-suffix">{dialog.suffix}</span>}
          </span>
        </label>
        <div className="prompt-actions">
          <button type="button" className="btn outline" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn primary">
            Aplicar
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function Dialogs() {
  const dialog = useEditorStore((s) => s.dialog)
  if (!dialog) return null
  if (dialog.kind === 'palette') return <Palette />
  if (dialog.kind === 'shortcuts') return <Shortcuts />
  return <Prompt dialog={dialog} />
}
