/**
 * Leitura e gravação de arquivos no computador do usuário.
 * Onde existe a File System Access API (Chrome, Edge), "Salvar" regrava o mesmo arquivo;
 * nos demais navegadores, o arquivo é baixado e a abertura usa o seletor comum.
 */

// Tipos mínimos da File System Access API (ainda não fazem parte das definições padrão do TypeScript).
interface WritableLike {
  write(data: string | Blob): Promise<void>
  close(): Promise<void>
}
export interface FileHandleLike {
  name: string
  getFile(): Promise<File>
  createWritable(): Promise<WritableLike>
}
interface PickerType {
  description: string
  accept: Record<string, string[]>
}
interface PickerWindow {
  showSaveFilePicker?: (opts: { suggestedName?: string; types?: PickerType[] }) => Promise<FileHandleLike>
  showOpenFilePicker?: (opts: { types?: PickerType[]; multiple?: boolean }) => Promise<FileHandleLike[]>
}

const picker = (): PickerWindow => window as unknown as PickerWindow

const PROJECT_TYPE: PickerType = { description: 'Projeto PlanBuilder', accept: { 'application/json': ['.json'] } }

export const canPickSaveLocation = (): boolean => typeof picker().showSaveFilePicker === 'function'

/** O usuário fechou o seletor de arquivos sem escolher: não é um erro. */
export const isCancel = (e: unknown): boolean => e instanceof DOMException && e.name === 'AbortError'

export function download(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Dá tempo de o navegador iniciar o download antes de liberar o endereço.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export async function writeToHandle(handle: FileHandleLike, text: string): Promise<void> {
  const w = await handle.createWritable()
  await w.write(text)
  await w.close()
}

/** Pede onde salvar. Retorna null se o navegador não oferece essa escolha (o chamador então baixa o arquivo). */
export async function pickSaveHandle(suggestedName: string): Promise<FileHandleLike | null> {
  const show = picker().showSaveFilePicker
  if (!show) return null
  return show({ suggestedName, types: [PROJECT_TYPE] })
}

/** Pede um arquivo de projeto para abrir. O `handle` vem quando o navegador permite regravar o arquivo depois. */
export async function pickOpenFile(): Promise<{ file: File; handle: FileHandleLike | null } | null> {
  const show = picker().showOpenFilePicker
  if (show) {
    const [handle] = await show({ types: [PROJECT_TYPE], multiple: false })
    return handle ? { file: await handle.getFile(), handle } : null
  }
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = () => {
      const file = input.files?.[0]
      resolve(file ? { file, handle: null } : null)
    }
    input.oncancel = () => resolve(null)
    input.click()
  })
}
