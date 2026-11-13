import { TOOLS } from '../app/tools'
import { fitView, zoom100 } from '../editor2d/view'
import { getComponent } from '../library/registry'
import { midpoint } from '../model/geometry'
import { centerOpening, commonWall, distributeOpenings, openingsOnWall } from '../model/openings'
import { allSelectable, deleteLabel, deleteObjects } from '../model/selection'
import { canMergeWalls, mergeWalls, nodePos, splitWall } from '../model/walls'
import type { Id } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { selectCanRedo, selectCanUndo, useProjectStore } from '../store/projectStore'
import type { CommandRegistry } from './registry'

const SOON = 'Disponível em breve'

/** Registra os comandos básicos do app. Retorna uma função que desfaz o registro. */
export function registerBuiltinCommands(registry: CommandRegistry): () => void {
  const project = useProjectStore.getState
  const editor = useEditorStore.getState
  /** Paredes selecionadas que ainda existem (a seleção pode apontar para algo desfeito). */
  const selectedWalls = (): Id[] => editor().selection.filter((id) => !!project().project.walls[id])
  const selectedOpenings = (): Id[] => editor().selection.filter((id) => !!project().project.openings[id])
  const selected = (): Id[] => allSelectable(project().project).filter((id) => editor().selection.includes(id))

  const disposers = [
    // Arquivo (implementados na fase 5: feat/persistencia)
    registry.register({ id: 'file.new', label: 'Novo projeto', category: 'Arquivo', description: SOON, run: () => {}, isEnabled: () => false }),
    registry.register({ id: 'file.open', label: 'Abrir projeto…', category: 'Arquivo', shortcuts: ['Ctrl+O'], description: SOON, run: () => {}, isEnabled: () => false }),
    registry.register({ id: 'file.save', label: 'Salvar projeto', category: 'Arquivo', shortcuts: ['Ctrl+S'], description: SOON, run: () => {}, isEnabled: () => false }),
    registry.register({ id: 'file.exportPng', label: 'Exportar PNG…', category: 'Arquivo', shortcuts: ['Ctrl+Shift+E'], description: SOON, run: () => {}, isEnabled: () => false }),

    // Editar
    registry.register({
      id: 'edit.undo',
      label: 'Desfazer',
      category: 'Editar',
      shortcuts: ['Ctrl+Z'],
      run: () => project().undo(),
      isEnabled: () => selectCanUndo(project()),
    }),
    registry.register({
      id: 'edit.redo',
      label: 'Refazer',
      category: 'Editar',
      shortcuts: ['Ctrl+Shift+Z', 'Ctrl+Y'],
      run: () => project().redo(),
      isEnabled: () => selectCanRedo(project()),
    }),

    registry.register({
      id: 'edit.delete',
      label: 'Excluir seleção',
      category: 'Editar',
      shortcuts: ['Del', 'Backspace'],
      run: () => {
        const ids = selected()
        project().update(deleteLabel(project().project, ids), (d) => deleteObjects(d, ids))
        editor().setSelection([])
      },
      isEnabled: () => selected().length > 0,
    }),
    registry.register({
      id: 'edit.selectAll',
      label: 'Selecionar tudo',
      category: 'Editar',
      shortcuts: ['Ctrl+A'],
      run: () => editor().setSelection(allSelectable(project().project)),
    }),
    registry.register({
      id: 'edit.clearSelection',
      label: 'Limpar seleção',
      category: 'Editar',
      shortcuts: ['Esc'],
      run: () => editor().setSelection([]),
      isEnabled: () => editor().selection.length > 0,
    }),

    // Paredes
    registry.register({
      id: 'wall.split',
      label: 'Dividir parede ao meio',
      category: 'Editar',
      run: () => {
        const id = selectedWalls()[0]!
        project().update('Parede dividida', (d) => {
          const w = d.walls[id]!
          splitWall(d, id, midpoint(nodePos(d, w.a), nodePos(d, w.b)))
        })
      },
      isEnabled: () => selectedWalls().length === 1,
    }),
    registry.register({
      id: 'wall.merge',
      label: 'Unir paredes',
      category: 'Editar',
      run: () => {
        const [a, b] = selectedWalls() as [Id, Id]
        let merged: Id | null = null
        project().update('Paredes unidas', (d) => {
          merged = mergeWalls(d, a, b)
        })
        if (merged) editor().setSelection([merged])
      },
      isEnabled: () => {
        const ids = selectedWalls()
        return ids.length === 2 && canMergeWalls(project().project, ids[0]!, ids[1]!)
      },
    }),

    // Portas e janelas
    registry.register({
      id: 'opening.flipSide',
      label: 'Inverter lado de abertura',
      category: 'Editar',
      shortcuts: ['F'],
      run: () => {
        const ids = selectedOpenings()
        project().update('Lado de abertura invertido', (d) => {
          for (const id of ids) d.openings[id]!.flipSide = !d.openings[id]!.flipSide
        })
      },
      isEnabled: () => selectedOpenings().some((id) => getComponent(project().project.openings[id]!.componentId).sided),
    }),
    registry.register({
      id: 'opening.flipHinge',
      label: 'Inverter dobradiça',
      category: 'Editar',
      shortcuts: ['Shift+F'],
      run: () => {
        const ids = selectedOpenings()
        project().update('Dobradiça invertida', (d) => {
          for (const id of ids) d.openings[id]!.flipHinge = !d.openings[id]!.flipHinge
        })
      },
      isEnabled: () => selectedOpenings().some((id) => getComponent(project().project.openings[id]!.componentId).hinged),
    }),
    registry.register({
      id: 'opening.center',
      label: 'Centralizar na parede',
      category: 'Editar',
      run: () => {
        const id = selectedOpenings()[0]!
        project().update('Abertura centralizada', (d) => void centerOpening(d, id))
      },
      isEnabled: () => selectedOpenings().length === 1,
    }),
    registry.register({
      id: 'opening.distribute',
      label: 'Distribuir aberturas na parede',
      category: 'Editar',
      run: () => {
        const wallId = commonWall(project().project, selectedOpenings())!
        project().update('Aberturas distribuídas', (d) => void distributeOpenings(d, wallId))
      },
      isEnabled: () => {
        const ids = selectedOpenings()
        const wallId = ids.length > 0 ? commonWall(project().project, ids) : null
        return !!wallId && openingsOnWall(project().project, wallId).length >= 2
      },
    }),

    // Ferramentas
    ...TOOLS.map((tool) =>
      registry.register({
        id: `tool.${tool.id}`,
        label: tool.label,
        category: 'Ferramentas',
        shortcuts: [tool.shortcut],
        description: tool.available ? undefined : 'Disponível em breve',
        run: () => editor().setTool(tool.id),
        isEnabled: () => tool.available,
      }),
    ),

    // Exibir
    registry.register({ id: 'view.2d', label: 'Vista 2D', category: 'Exibir', run: () => editor().setViewMode('2d') }),
    registry.register({ id: 'view.split', label: 'Vista dividida 2D/3D', category: 'Exibir', run: () => editor().setViewMode('split') }),
    registry.register({ id: 'view.3d', label: 'Vista 3D', category: 'Exibir', run: () => editor().setViewMode('3d') }),
    registry.register({
      id: 'view.fit',
      label: 'Ajustar à tela',
      category: 'Exibir',
      shortcuts: ['Shift+1'],
      run: () => editor().setView(fitView(project().project, editor().canvasSize)),
    }),
    registry.register({
      id: 'view.zoom100',
      label: 'Zoom 100%',
      category: 'Exibir',
      shortcuts: ['Shift+0'],
      run: () => editor().setView(zoom100(editor().view, editor().canvasSize)),
    }),
  ]

  return () => disposers.forEach((d) => d())
}
