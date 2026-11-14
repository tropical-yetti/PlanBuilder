import '../commands/setup'
import { commands } from '../commands/registry'
import { useClipboardEvents } from '../commands/useClipboardEvents'
import { useShortcuts } from '../commands/useShortcuts'
import { LibraryPanel } from '../library/LibraryPanel'
import { useEffect } from 'react'
import { openFile } from '../persistence/projectFile'
import { ContextMenu } from './ContextMenu'
import { Dialogs } from './Dialogs'
import { NoticeToast } from './NoticeToast'
import { SidePanel } from './SidePanel'
import { StatusBar } from './StatusBar'
import { ToolBar } from './ToolBar'
import { TopBar } from './TopBar'
import { Workspace } from './Workspace'

export function App() {
  useShortcuts(commands)
  useClipboardEvents()

  // Arrastar um arquivo de projeto do computador para a janela abre o projeto.
  useEffect(() => {
    const hasFiles = (e: DragEvent) => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files')
    const onDragOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault()
    }
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      const file = e.dataTransfer?.files[0]
      if (file) openFile(file)
    }
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('drop', onDrop)
    }
  }, [])

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
      <NoticeToast />
    </div>
  )
}
