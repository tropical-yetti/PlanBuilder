import { registerBuiltinCommands } from './builtin'
import { registerEditingCommands } from './editing'
import { commands } from './registry'

// Registrado ao carregar o módulo, para que os componentes já encontrem os comandos no primeiro render.
const disposers = [registerBuiltinCommands(commands), registerEditingCommands(commands)]
const dispose = () => disposers.forEach((d) => d())

// Recarregamento a quente (desenvolvimento): remove os comandos antes de o módulo ser executado de novo.
if (import.meta.hot) import.meta.hot.dispose(dispose)
