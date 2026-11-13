import '../commands/setup'
import { commands } from '../commands/registry'
import { useClipboardEvents } from '../commands/useClipboardEvents'
import { useShortcuts } from '../commands/useShortcuts'
import { LibraryPanel } from '../library/LibraryPanel'
import { ContextMenu } from './ContextMenu'
import { Dialogs } from './Dialogs'
import { SidePanel } from './SidePanel'
import { StatusBar } from './StatusBar'
import { ToolBar } from './ToolBar'
import { TopBar } from './TopBar'
import { Workspace } from './Workspace'

export function App() {
  useShortcuts(commands)
  useClipboardEvents()

  return (
    <div className="app">
      <TopBar />
      <ToolBar />
      <LibraryPanel />
      <Workspace />
      <SidePanel />
      <StatusBar />
      <ContextMenu />
      <Dialogs />
    </div>
  )
}
