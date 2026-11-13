import { useEffect } from 'react'
import { useEditorStore } from '../store/editorStore'

/** Aviso passageiro no canto da tela (ex.: "Salvo em…", erro ao abrir arquivo). */
export function NoticeToast() {
  const notice = useEditorStore((s) => s.notice)
  const clear = useEditorStore((s) => s.clearNotice)

  useEffect(() => {
    if (!notice) return
    // Erros ficam mais tempo na tela, para dar tempo de ler.
    const timer = setTimeout(clear, notice.kind === 'error' ? 9000 : 3500)
    return () => clearTimeout(timer)
  }, [notice, clear])

  if (!notice) return null
  return (
    <div className={`toast ${notice.kind}`} role={notice.kind === 'error' ? 'alert' : 'status'}>
      <span>{notice.text}</span>
      <button type="button" className="toast-close" onClick={clear} aria-label="Fechar aviso">
        ✕
      </button>
    </div>
  )
}
