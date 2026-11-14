import { describe, expect, it, vi } from 'vitest'
import { CommandRegistry } from './registry'
import { registerBuiltinCommands } from './builtin'
import { useEditorStore } from '../store/editorStore'

describe('CommandRegistry', () => {
  it('executa pelo id e pelo atalho', () => {
    const reg = new CommandRegistry()
    const run = vi.fn()
    reg.register({ id: 'x', label: 'X', category: 'Editar', shortcuts: ['ctrl+shift+x'], run })
    expect(reg.execute('x')).toBe(true)
    expect(reg.findByShortcut('Ctrl+Shift+X')?.id).toBe('x')
    expect(reg.findByEvent({ key: 'X', code: 'KeyX', ctrlKey: true, metaKey: false, altKey: false, shiftKey: true })?.id).toBe('x')
    expect(run).toHaveBeenCalledOnce()
  })

  it('não executa comandos desativados', () => {
    const reg = new CommandRegistry()
    const run = vi.fn()
    reg.register({ id: 'x', label: 'X', category: 'Editar', run, isEnabled: () => false })
    expect(reg.execute('x')).toBe(false)
    expect(run).not.toHaveBeenCalled()
  })

  it('impede atalhos e ids duplicados', () => {
    const reg = new CommandRegistry()
    reg.register({ id: 'a', label: 'A', category: 'Editar', shortcuts: ['Ctrl+Z'], run: () => {} })
    expect(() => reg.register({ id: 'b', label: 'B', category: 'Editar', shortcuts: ['ctrl+z'], run: () => {} })).toThrow(/Ctrl\+Z/)
    expect(() => reg.register({ id: 'a', label: 'A2', category: 'Editar', run: () => {} })).toThrow()
  })

  it('remover um comando libera o atalho', () => {
    const reg = new CommandRegistry()
    const dispose = reg.register({ id: 'a', label: 'A', category: 'Editar', shortcuts: ['W'], run: () => {} })
    dispose()
    expect(reg.findByShortcut('W')).toBeUndefined()
    expect(() => reg.register({ id: 'b', label: 'B', category: 'Editar', shortcuts: ['W'], run: () => {} })).not.toThrow()
  })
})

describe('comandos básicos', () => {
  it('registram sem conflito de atalhos e trocam a ferramenta', () => {
    const reg = new CommandRegistry()
    const dispose = registerBuiltinCommands(reg)
    expect(reg.findByShortcut('W')?.id).toBe('tool.wall')
    reg.execute('tool.wall')
    expect(useEditorStore.getState().tool).toBe('wall')
    dispose()
    expect(reg.list()).toHaveLength(0)
  })

  it('não usam atalhos reservados pelo navegador', () => {
    const reg = new CommandRegistry()
    registerBuiltinCommands(reg)
    const reserved = ['Ctrl+R', 'Ctrl+L', 'Ctrl+W', 'Ctrl+T', 'Ctrl+N']
    for (const s of reserved) expect(reg.findByShortcut(s)).toBeUndefined()
  })
})
