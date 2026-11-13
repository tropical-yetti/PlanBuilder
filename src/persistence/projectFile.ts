/** Ações de arquivo: novo, abrir, salvar e salvar como (docs/PLANO.md, seção 8). */
import { fitView } from '../editor2d/view'
import { createEmptyProject } from '../model/project'
import type { Project } from '../model/types'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'
import { canPickSaveLocation, download, isCancel, pickOpenFile, pickSaveHandle, writeToHandle, type FileHandleLike } from './fileIO'
import { fileNameFor, parseProjectText, serializeProject } from './schema'

/** Arquivo aberto, quando o navegador permite regravá-lo. */
let handle: FileHandleLike | null = null

const doc = () => useProjectStore.getState()
const editor = () => useEditorStore.getState()

export function hasContent(p: Project): boolean {
  return Object.keys(p.walls).length + Object.keys(p.texts).length + Object.keys(p.dimensions).length > 0
}

/** Há trabalho que ainda não está num arquivo (ou mudou desde o último salvamento)? */
export function hasUnsavedWork(): boolean {
  const { file } = editor()
  return hasContent(doc().project) && (file.name === null || doc().revision !== file.savedRevision)
}

/** Troca o projeto aberto: carrega, limpa o que era da tela anterior e enquadra o desenho. */
function replaceProject(project: Project, fileName: string | null, newHandle: FileHandleLike | null): void {
  doc().load(project)
  handle = newHandle
  const e = editor()
  e.setSelection([])
  e.setTool('select')
  e.setRenamingRoom(null)
  e.setTextEdit(null)
  e.setFile({ name: fileName, savedRevision: doc().revision })
  if (e.canvasSize.width > 0) e.setView(fitView(project, e.canvasSize))
}

/** Executa a ação; se houver trabalho não salvo em arquivo, pede confirmação antes. */
function guard(title: string, confirmLabel: string, action: () => void): void {
  if (!hasUnsavedWork()) {
    action()
    return
  }
  editor().setDialog({
    kind: 'confirm',
    title,
    message: 'O projeto atual tem alterações que não foram salvas em arquivo. Se continuar, elas serão perdidas.',
    confirmLabel,
    onConfirm: action,
  })
}

export function newProject(): void {
  guard('Criar um novo projeto?', 'Descartar e criar novo', () => replaceProject(createEmptyProject(), null, null))
}

/** Abre o conteúdo de um arquivo. Se não for um projeto válido, avisa e mantém o projeto atual. */
export function loadProjectText(text: string, fileName: string, newHandle: FileHandleLike | null = null): boolean {
  const r = parseProjectText(text)
  if (!r.ok) {
    editor().notify(`Não foi possível abrir "${fileName}". ${r.error}`, 'error')
    return false
  }
  replaceProject(r.project, fileName, newHandle)
  if (r.warnings.length > 0) editor().notify(`Projeto aberto com correções: ${r.warnings.join('; ')}.`)
  return true
}

/** Abre um arquivo arrastado para a janela ou escolhido no seletor. */
export function openFile(file: File, newHandle: FileHandleLike | null = null): void {
  guard('Abrir outro projeto?', 'Descartar e abrir', () => {
    file
      .text()
      .then((text) => loadProjectText(text, file.name, newHandle))
      .catch(() => editor().notify(`Não foi possível ler "${file.name}".`, 'error'))
  })
}

export function openProject(): void {
  guard('Abrir outro projeto?', 'Descartar e abrir', () => {
    pickOpenFile()
      .then(async (picked) => {
        if (picked) loadProjectText(await picked.file.text(), picked.file.name, picked.handle)
      })
      .catch((e: unknown) => {
        if (!isCancel(e)) editor().notify('Não foi possível abrir o arquivo.', 'error')
      })
  })
}

/**
 * Salva o projeto. Com um arquivo já aberto (e permissão do navegador), regrava nele;
 * senão pergunta onde salvar; nos navegadores sem essa opção, baixa o arquivo.
 */
export async function saveProject(opts: { saveAs?: boolean } = {}): Promise<boolean> {
  const project = doc().project
  const revision = doc().revision
  const text = serializeProject(project)
  const suggested = editor().file.name ?? fileNameFor(project.name)
  try {
    if (handle && !opts.saveAs) {
      await writeToHandle(handle, text)
    } else if (canPickSaveLocation()) {
      const picked = await pickSaveHandle(suggested)
      if (!picked) return false
      await writeToHandle(picked, text)
      handle = picked
    } else {
      download(new Blob([text], { type: 'application/json' }), suggested)
      editor().setFile({ name: suggested, savedRevision: revision })
      editor().notify(`Projeto baixado como "${suggested}".`)
      return true
    }
  } catch (e) {
    if (!isCancel(e)) editor().notify('Não foi possível salvar o arquivo.', 'error')
    return false
  }
  editor().setFile({ name: handle?.name ?? suggested, savedRevision: revision })
  editor().notify(`Salvo em "${handle?.name ?? suggested}".`)
  return true
}

/** Para testes. */
export function resetFileState(): void {
  handle = null
  editor().setFile({ name: null, savedRevision: doc().revision })
}
