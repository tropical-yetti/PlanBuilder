import { TOOLS } from '../app/tools'
import { useEditorStore } from '../store/editorStore'
import { selectCanRedo, selectCanUndo, useProjectStore } from '../store/projectStore'
import type { CommandRegistry } from './registry'

const SOON = 'Disponível em breve'

/** Registra os comandos básicos do app. Retorna uma função que desfaz o registro. */
export function registerBuiltinCommands(registry: CommandRegistry): () => void {
  const project = useProjectStore.getState
  const editor = useEditorStore.getState

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

    // Ferramentas
    ...TOOLS.map((tool) =>
      registry.register({
        id: `tool.${tool.id}`,
        label: tool.label,
        category: 'Ferramentas',
        shortcuts: [tool.shortcut],
        run: () => editor().setTool(tool.id),
      }),
    ),

    // Exibir
    registry.register({ id: 'view.2d', label: 'Vista 2D', category: 'Exibir', run: () => editor().setViewMode('2d') }),
    registry.register({ id: 'view.split', label: 'Vista dividida 2D/3D', category: 'Exibir', run: () => editor().setViewMode('split') }),
    registry.register({ id: 'view.3d', label: 'Vista 3D', category: 'Exibir', run: () => editor().setViewMode('3d') }),
  ]

  return () => disposers.forEach((d) => d())
}
