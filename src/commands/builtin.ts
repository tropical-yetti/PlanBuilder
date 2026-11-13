import { TOOLS } from '../app/tools'
import { fitView, zoom100 } from '../editor2d/view'
import { midpoint } from '../model/geometry'
import { canMergeWalls, deleteWall, mergeWalls, nodePos, splitWall } from '../model/walls'
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
        const ids = selectedWalls()
        project().update(ids.length > 1 ? 'Paredes excluídas' : 'Parede excluída', (d) => {
          for (const id of ids) deleteWall(d, id)
        })
        editor().setSelection([])
      },
      isEnabled: () => selectedWalls().length > 0,
    }),
    registry.register({
      id: 'edit.selectAll',
      label: 'Selecionar tudo',
      category: 'Editar',
      shortcuts: ['Ctrl+A'],
      run: () => editor().setSelection(Object.keys(project().project.walls)),
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
