import '../commands/setup'
import { commands } from '../commands/registry'
import { useShortcuts } from '../commands/useShortcuts'
import { LibraryPanel } from '../library/LibraryPanel'
import { SidePanel } from './SidePanel'
import { StatusBar } from './StatusBar'
import { ToolBar } from './ToolBar'
import { TopBar } from './TopBar'
import { Workspace } from './Workspace'

export function App() {
  useShortcuts(commands)

  return (
    <div className="app">
      <TopBar />
      <ToolBar />
      <LibraryPanel />
      <Workspace />
      <SidePanel />
      <StatusBar />
    </div>
  )
}
