import { normalizeShortcut, shortcutFromEvent, type KeyLike } from './shortcuts'

export type CommandCategory = 'Arquivo' | 'Editar' | 'Ferramentas' | 'Exibir'

/**
 * Uma ação do app. Cada comando é registrado uma única vez e pode ser usado pelo atalho de teclado,
 * pelos botões, pelo menu de contexto e pela paleta de comandos (docs/PLANO.md, seção 6).
 */
export interface Command {
  id: string
  label: string
  category: CommandCategory
  /** Um ou mais atalhos, ex.: ["Ctrl+Shift+Z", "Ctrl+Y"]. */
  shortcuts?: string[]
  /**
   * Atalho apenas exibido (não ligado ao teclado pelo registro). Usado por copiar/recortar/colar,
   * que são tratados pelos eventos do navegador para funcionar entre abas.
   */
  hint?: string
  description?: string
  run: () => void
  /** Se retornar false, o comando aparece desativado e o atalho é ignorado. */
  isEnabled?: () => boolean
}

interface RegisteredCommand extends Command {
  shortcuts: string[]
}

export class CommandRegistry {
  private commands = new Map<string, RegisteredCommand>()
  private byShortcut = new Map<string, string>()

  register(command: Command): () => void {
    if (this.commands.has(command.id)) throw new Error(`Comando já registrado: ${command.id}`)
    const shortcuts = (command.shortcuts ?? []).map(normalizeShortcut)
    for (const s of shortcuts) {
      const owner = this.byShortcut.get(s)
      if (owner) throw new Error(`Atalho ${s} já usado por "${owner}" (ao registrar "${command.id}")`)
    }
    this.commands.set(command.id, { ...command, shortcuts })
    for (const s of shortcuts) this.byShortcut.set(s, command.id)
    return () => this.unregister(command.id)
  }

  unregister(id: string): void {
    const cmd = this.commands.get(id)
    if (!cmd) return
    for (const s of cmd.shortcuts) this.byShortcut.delete(s)
    this.commands.delete(id)
  }

  get(id: string): RegisteredCommand | undefined {
    return this.commands.get(id)
  }

  list(): RegisteredCommand[] {
    return [...this.commands.values()]
  }

  isEnabled(id: string): boolean {
    const cmd = this.commands.get(id)
    return !!cmd && (cmd.isEnabled?.() ?? true)
  }

  /** Executa o comando se ele existir e estiver ativo. Retorna true se executou. */
  execute(id: string): boolean {
    const cmd = this.commands.get(id)
    if (!cmd || !(cmd.isEnabled?.() ?? true)) return false
    cmd.run()
    return true
  }

  findByShortcut(shortcut: string): RegisteredCommand | undefined {
    const id = this.byShortcut.get(normalizeShortcut(shortcut))
    return id ? this.commands.get(id) : undefined
  }

  findByEvent(e: KeyLike): RegisteredCommand | undefined {
    const s = shortcutFromEvent(e)
    if (!s) return undefined
    const id = this.byShortcut.get(s)
    return id ? this.commands.get(id) : undefined
  }
}

/** Registro global usado pelo app. */
export const commands = new CommandRegistry()
