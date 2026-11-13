import { registerBuiltinCommands } from './builtin'
import { commands } from './registry'

// Registrado ao carregar o módulo, para que os componentes já encontrem os comandos no primeiro render.
const dispose = registerBuiltinCommands(commands)

// Recarregamento a quente (desenvolvimento): remove os comandos antes de o módulo ser executado de novo.
if (import.meta.hot) import.meta.hot.dispose(dispose)
