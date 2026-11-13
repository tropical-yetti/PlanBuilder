/** Comandos de produtividade (docs/PLANO.md, seção 6). */
import { quantities } from '../model/quantities'
import { allSelectable, classify, isLocked, lockedIds, setLocked, similarTo } from '../model/selection'
import {
  alignSelection,
  distributeSelection,
  mirrorSelection,
  nudgeOpenings,
  rotateSelection,
  scaleSelection,
  selectionUnits,
  translateSelection,
  type AlignMode,
} from '../model/transforms'
import { formatCmValue } from '../model/units'
import { splitWall, wallLength } from '../model/walls'
import type { Id, Point } from '../model/types'
import { LAYER_LABELS, useEditorStore, type Layers } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import * as clipboard from './clipboard'
import type { Command, CommandRegistry } from './registry'

export function registerEditingCommands(registry: CommandRegistry): () => void {
  const doc = useProjectStore.getState
  const editor = useEditorStore.getState
  const project = () => doc().project
  /** Selecionados que existem e não estão bloqueados. */
  const selected = (): Id[] => {
    const p = project()
    return editor().selection.filter((id) => (p.walls[id] || p.openings[id] || p.texts[id] || p.dimensions[id]) && !isLocked(p, id))
  }
  const sel = () => classify(project(), selected())
  /** Objetos que podem ser movidos livremente (aberturas só andam ao longo da parede). */
  const movable = (): Id[] => {
    const c = sel()
    return [...c.walls, ...c.texts, ...c.dimensions].map((o) => o.id)
  }
  const context = () => editor().contextMenu
  const writeSystemClipboard = (text: string | null) => {
    if (text) void navigator.clipboard?.writeText(text).catch(() => {})
  }

  const defs: Command[] = [
    // --- Área de transferência -------------------------------------------------------------
    { id: 'edit.copy', label: 'Copiar', category: 'Editar', hint: 'Ctrl+C', run: () => writeSystemClipboard(clipboard.copy()), isEnabled: clipboard.hasSelection },
    { id: 'edit.cut', label: 'Recortar', category: 'Editar', hint: 'Ctrl+X', run: () => writeSystemClipboard(clipboard.cut()), isEnabled: () => selected().length > 0 },
    { id: 'edit.paste', label: 'Colar', category: 'Editar', hint: 'Ctrl+V', run: () => void clipboard.paste(), isEnabled: clipboard.hasClip },
    {
      id: 'edit.pasteHere',
      label: 'Colar aqui',
      category: 'Editar',
      run: () => void clipboard.paste({ at: context()?.world }),
      isEnabled: () => clipboard.hasClip() && !!context(),
    },
    {
      id: 'edit.pasteInPlace',
      label: 'Colar no mesmo lugar',
      category: 'Editar',
      shortcuts: ['Ctrl+Shift+V'],
      run: () => void clipboard.paste({ inPlace: true }),
      isEnabled: clipboard.hasClip,
    },
    { id: 'edit.duplicate', label: 'Duplicar', category: 'Editar', shortcuts: ['Ctrl+D'], run: clipboard.duplicate, isEnabled: clipboard.hasSelection },
    {
      id: 'edit.copyStyle',
      label: 'Copiar propriedades',
      category: 'Editar',
      shortcuts: ['Ctrl+Alt+C'],
      description: 'Guarda as medidas do objeto (espessura e altura da parede, medidas da porta ou janela)',
      run: clipboard.copyProperties,
      isEnabled: clipboard.hasSelection,
    },
    {
      id: 'edit.pasteStyle',
      label: 'Colar propriedades',
      category: 'Editar',
      shortcuts: ['Ctrl+Alt+V'],
      run: clipboard.pasteProperties,
      isEnabled: () => clipboard.hasStyle() && selected().length > 0,
    },

    // --- Mover com as setas ------------------------------------------------------------------
    ...(
      [
        ['Left', 'para a esquerda', -1, 0],
        ['Right', 'para a direita', 1, 0],
        ['Up', 'para cima', 0, -1],
        ['Down', 'para baixo', 0, 1],
      ] as const
    ).flatMap(([key, label, dx, dy]) =>
      ([1, 10] as const).map((step): Command => {
        const delta: Point = { x: dx * step, y: dy * step }
        return {
          id: `edit.nudge${key}${step === 10 ? 'Big' : ''}`,
          label: `Mover ${step} cm ${label}`,
          category: 'Editar',
          shortcuts: [step === 10 ? `Shift+${key}` : key],
          run: () => {
            const ids = movable()
            const openings = sel().openings.map((o) => o.id)
            doc().update('Movido com as setas', (d) => {
              if (ids.length > 0) translateSelection(d, ids, delta)
              // Portas e janelas selecionadas sem a sua parede deslizam ao longo dela.
              const moved = new Set(ids)
              nudgeOpenings(d, openings.filter((id) => !moved.has(d.openings[id]?.wallId ?? '')), delta)
            })
          },
          isEnabled: () => selected().length > 0,
        }
      }),
    ),

    // --- Girar, espelhar, redimensionar ------------------------------------------------------
    {
      id: 'edit.rotateCw',
      label: 'Girar 90° no sentido horário',
      category: 'Editar',
      shortcuts: ['R'],
      run: () => doc().update('Girado 90°', (d) => rotateSelection(d, movable(), 90)),
      isEnabled: () => movable().length > 0,
    },
    {
      id: 'edit.rotateCcw',
      label: 'Girar 90° no sentido anti-horário',
      category: 'Editar',
      shortcuts: ['Shift+R'],
      run: () => doc().update('Girado 90°', (d) => rotateSelection(d, movable(), -90)),
      isEnabled: () => movable().length > 0,
    },
    {
      id: 'edit.rotateBy',
      label: 'Girar por um ângulo…',
      category: 'Editar',
      run: () =>
        editor().setDialog({
          kind: 'prompt',
          title: 'Girar seleção',
          label: 'Ângulo (positivo = sentido horário)',
          suffix: '°',
          initial: '45',
          onSubmit: (deg) => doc().update(`Girado ${deg}°`, (d) => rotateSelection(d, movable(), deg)),
        }),
      isEnabled: () => movable().length > 0,
    },
    {
      id: 'edit.mirrorH',
      label: 'Espelhar na horizontal',
      category: 'Editar',
      shortcuts: ['Shift+H'],
      run: () => doc().update('Espelhado', (d) => mirrorSelection(d, movable(), 'horizontal')),
      isEnabled: () => movable().length > 0,
    },
    {
      id: 'edit.mirrorV',
      label: 'Espelhar na vertical',
      category: 'Editar',
      shortcuts: ['Shift+V'],
      run: () => doc().update('Espelhado', (d) => mirrorSelection(d, movable(), 'vertical')),
      isEnabled: () => movable().length > 0,
    },
    {
      id: 'edit.scale',
      label: 'Redimensionar a planta por uma medida conhecida…',
      category: 'Editar',
      description: 'Selecione uma parede e informe quanto ela deveria medir: toda a planta é ajustada na mesma proporção',
      run: () => {
        const wall = sel().walls[0]!
        const current = wallLength(project(), wall)
        editor().setDialog({
          kind: 'prompt',
          title: 'Redimensionar a planta',
          label: 'Medida correta da parede selecionada',
          suffix: 'cm',
          initial: formatCmValue(current),
          onSubmit: (length) => {
            if (length <= 0) return
            doc().update('Planta redimensionada', (d) => scaleSelection(d, allSelectable(d), length / current))
          },
        })
      },
      isEnabled: () => sel().walls.length === 1 && sel().count === 1,
    },

    // --- Alinhar e distribuir ----------------------------------------------------------------
    ...(
      [
        ['left', 'Alinhar à esquerda'],
        ['centerX', 'Alinhar ao centro (horizontal)'],
        ['right', 'Alinhar à direita'],
        ['top', 'Alinhar ao topo'],
        ['centerY', 'Alinhar ao meio (vertical)'],
        ['bottom', 'Alinhar à base'],
      ] as [AlignMode, string][]
    ).map(
      ([mode, label]): Command => ({
        id: `align.${mode}`,
        label,
        category: 'Editar',
        run: () => doc().update(label, (d) => alignSelection(d, movable(), mode)),
        isEnabled: () => selectionUnits(project(), movable()).length >= 2,
      }),
    ),
    ...(['x', 'y'] as const).map(
      (axis): Command => ({
        id: `distribute.${axis}`,
        label: axis === 'x' ? 'Distribuir na horizontal' : 'Distribuir na vertical',
        category: 'Editar',
        run: () => doc().update('Distribuído', (d) => distributeSelection(d, movable(), axis)),
        isEnabled: () => selectionUnits(project(), movable()).length >= 3,
      }),
    ),

    // --- Seleção -------------------------------------------------------------------------------
    {
      id: 'select.similar',
      label: 'Selecionar semelhantes',
      category: 'Editar',
      description: 'Paredes da mesma espessura, portas e janelas do mesmo tipo, todos os textos ou todas as cotas',
      run: () => editor().setSelection([...new Set(selected().flatMap((id) => similarTo(project(), id)))]),
      isEnabled: () => selected().length > 0,
    },
    {
      id: 'room.selectWalls',
      label: 'Selecionar paredes do cômodo',
      category: 'Editar',
      run: () => {
        const room = quantities(project()).rooms.find((r) => r.key === context()?.roomKey)
        if (room) editor().setSelection(room.wallIds.filter((id) => !isLocked(project(), id)))
      },
      isEnabled: () => !!context()?.roomKey,
    },
    {
      id: 'room.rename',
      label: 'Renomear cômodo',
      category: 'Editar',
      run: () => editor().setRenamingRoom(context()?.roomKey ?? null),
      isEnabled: () => !!context()?.roomKey,
    },
    {
      id: 'wall.splitHere',
      label: 'Dividir parede aqui',
      category: 'Editar',
      run: () => {
        const c = context()!
        doc().update('Parede dividida', (d) => void splitWall(d, c.id!, c.world))
      },
      isEnabled: () => {
        const c = context()
        return !!c?.id && !!project().walls[c.id] && !isLocked(project(), c.id)
      },
    },

    // --- Bloquear ------------------------------------------------------------------------------
    {
      id: 'edit.lock',
      label: 'Bloquear',
      category: 'Editar',
      shortcuts: ['Ctrl+Shift+L'],
      description: 'Objetos bloqueados não são selecionados, movidos nem excluídos',
      run: () => {
        const ids = selected()
        doc().update(ids.length > 1 ? 'Objetos bloqueados' : 'Objeto bloqueado', (d) => setLocked(d, ids, true))
        editor().setSelection([])
      },
      isEnabled: () => selected().length > 0,
    },
    {
      id: 'edit.unlock',
      label: 'Desbloquear',
      category: 'Editar',
      run: () => {
        const id = context()!.id!
        doc().update('Objeto desbloqueado', (d) => setLocked(d, [id], false))
        editor().setSelection([id])
      },
      isEnabled: () => {
        const id = context()?.id
        return !!id && isLocked(project(), id)
      },
    },
    {
      id: 'edit.unlockAll',
      label: 'Desbloquear tudo',
      category: 'Editar',
      run: () => doc().update('Tudo desbloqueado', (d) => setLocked(d, lockedIds(d), false)),
      isEnabled: () => lockedIds(project()).length > 0,
    },

    // --- Camadas -------------------------------------------------------------------------------
    ...(Object.keys(LAYER_LABELS) as (keyof Layers)[]).map(
      (layer): Command => ({
        id: `layer.${layer}`,
        label: `Mostrar/ocultar: ${LAYER_LABELS[layer]}`,
        category: 'Exibir',
        run: () => editor().toggleLayer(layer),
      }),
    ),

    // --- Descoberta ----------------------------------------------------------------------------
    { id: 'app.palette', label: 'Paleta de comandos', category: 'Exibir', shortcuts: ['Ctrl+K'], run: () => editor().setDialog({ kind: 'palette' }) },
    { id: 'app.shortcuts', label: 'Atalhos de teclado', category: 'Exibir', shortcuts: ['?'], run: () => editor().setDialog({ kind: 'shortcuts' }) },
    { id: 'app.history', label: 'Mostrar histórico', category: 'Exibir', run: () => editor().setSidePanelTab('history') },
  ]

  const disposers = defs.map((c) => registry.register(c))
  return () => disposers.forEach((d) => d())
}
