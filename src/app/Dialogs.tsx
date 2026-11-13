import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { commands, type CommandCategory } from '../commands/registry'
import { formatShortcut, isMacPlatform } from '../commands/shortcuts'
import { normalizeText } from '../library/registry'
import { parseLength } from '../model/units'
import { DEFAULT_EXPORT, type ExportOptions } from '../persistence/exportLayout'
import { download } from '../persistence/fileIO'
import { fileNameFor } from '../persistence/schema'
import { canCapture3D, capture3D } from '../viewer3d/capture'
import { useEditorStore, type Dialog } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

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

function Confirm({ dialog }: { dialog: Extract<Dialog, { kind: 'confirm' }> }) {
  return (
    <Modal title={dialog.title}>
      <div className="prompt">
        <h2>{dialog.title}</h2>
        <p className="modal-text">{dialog.message}</p>
        <div className="prompt-actions">
          <button type="button" className="btn outline" autoFocus onClick={close}>
            Cancelar
          </button>
          <button
            type="button"
            className="btn danger-solid"
            onClick={() => {
              close()
              dialog.onConfirm()
            }}
          >
            {dialog.confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}

/** Opções lembradas enquanto a página estiver aberta. */
let lastExport: ExportOptions = DEFAULT_EXPORT

const EXPORT_CHECKS: { key: 'wallLengths' | 'roomLabels' | 'areaTable' | 'grid'; label: string }[] = [
  { key: 'wallLengths', label: 'Medidas das paredes' },
  { key: 'roomLabels', label: 'Nomes e áreas dos cômodos' },
  { key: 'areaTable', label: 'Quadro de áreas abaixo do desenho' },
  { key: 'grid', label: 'Grade' },
]

function ExportPng() {
  const [options, setOptions] = useState<ExportOptions>(lastExport)
  const [busy, setBusy] = useState(false)
  // A vista 3D só pode ser exportada enquanto está aberta (modo 3D ou Dividido).
  const has3D = canCapture3D()
  const [source, setSource] = useState<'2d' | '3d'>(has3D && useEditorStore.getState().viewMode === '3d' ? '3d' : '2d')

  async function run() {
    setBusy(true)
    lastExport = options
    const project = useProjectStore.getState().project
    const name = fileNameFor(source === '3d' ? `${project.name} 3D` : project.name, '.png')
    try {
      if (source === '3d') {
        download(await capture3D(options.pixelRatio), name)
      } else {
        // Carregado só quando necessário: a exportação monta o desenho fora da tela.
        const { renderPng } = await import('../persistence/exportPng')
        download(await renderPng(project, options), name)
      }
      close()
      useEditorStore.getState().notify(`Imagem exportada como "${name}".`)
    } catch (e) {
      setBusy(false)
      useEditorStore.getState().notify(e instanceof Error ? e.message : 'Não foi possível exportar a imagem.', 'error')
    }
  }

  return (
    <Modal title="Exportar PNG">
      <div className="prompt">
        <h2>Exportar PNG</h2>
        {has3D && (
          <div className="field">
            <span className="field-label">O que exportar</span>
            <div className="segmented small" role="radiogroup" aria-label="O que exportar">
              <button type="button" role="radio" aria-checked={source === '2d'} className={source === '2d' ? 'active' : ''} onClick={() => setSource('2d')}>
                Planta 2D
              </button>
              <button type="button" role="radio" aria-checked={source === '3d'} className={source === '3d' ? 'active' : ''} onClick={() => setSource('3d')}>
                Vista 3D
              </button>
            </div>
          </div>
        )}
        <p className="modal-text">
          {source === '3d'
            ? 'A imagem mostra a vista 3D como está na tela agora: ajuste a câmera antes de exportar.'
            : 'A imagem mostra a planta inteira sobre fundo branco, com cotas e textos.'}
        </p>
        <div className="export-options" hidden={source === '3d'}>
          {EXPORT_CHECKS.map(({ key, label }) => (
            <label key={key} className="layers-item">
              <input type="checkbox" checked={options[key]} onChange={(e) => setOptions({ ...options, [key]: e.target.checked })} />
              {label}
            </label>
          ))}
        </div>
        <div className="field">
          <span className="field-label">Resolução</span>
          <div className="segmented small" role="radiogroup" aria-label="Resolução">
            {([2, 4] as const).map((r) => (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={options.pixelRatio === r}
                className={options.pixelRatio === r ? 'active' : ''}
                title={r === 2 ? 'Boa para tela e mensagens' : 'Boa para impressão'}
                onClick={() => setOptions({ ...options, pixelRatio: r })}
              >
                {r === 2 ? 'Normal' : 'Alta'}
              </button>
            ))}
          </div>
        </div>
        <div className="prompt-actions">
          <button type="button" className="btn outline" onClick={close}>
            Cancelar
          </button>
          <button type="button" className="btn primary" disabled={busy} onClick={run}>
            {busy ? 'Gerando…' : 'Exportar'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function Dialogs() {
  const dialog = useEditorStore((s) => s.dialog)
  if (!dialog) return null
  if (dialog.kind === 'palette') return <Palette />
  if (dialog.kind === 'shortcuts') return <Shortcuts />
  if (dialog.kind === 'confirm') return <Confirm dialog={dialog} />
  if (dialog.kind === 'export') return <ExportPng />
  return <Prompt dialog={dialog} />
}
