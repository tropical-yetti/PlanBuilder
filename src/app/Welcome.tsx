import { useState } from 'react'
import { hasContent, loadSample } from '../persistence/projectFile'
import { useEditorStore } from '../store/editorStore'
import { useProjectStore } from '../store/projectStore'

export const WELCOME_KEY = 'planbuilder:welcome'

function wasDismissed(): boolean {
  try {
    return localStorage.getItem(WELCOME_KEY) === 'dismissed'
  } catch {
    return false
  }
}

/** Boas-vindas na primeira abertura: três passos e a opção de começar por um exemplo. */
export function Welcome() {
  const empty = useProjectStore((s) => !hasContent(s.project))
  const [dismissed, setDismissed] = useState(wasDismissed)

  if (dismissed || !empty) return null

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(WELCOME_KEY, 'dismissed')
    } catch {
      // sem armazenamento: as boas-vindas só aparecem de novo na próxima visita
    }
  }

  return (
    <div className="welcome" role="dialog" aria-label="Boas-vindas">
      <h2>Bem-vindo ao PlanBuilder</h2>
      <p className="modal-text">Desenhe a planta da sua casa em poucos minutos:</p>
      <ol>
        <li>
          <strong>Paredes.</strong> Tecle <kbd>A</kbd> e arraste para criar um cômodo, ou <kbd>W</kbd> para desenhar parede por parede. Digite a medida e
          tecle <kbd>Enter</kbd> para o tamanho exato.
        </li>
        <li>
          <strong>Portas e janelas.</strong> Clique num item da biblioteca, à esquerda, e depois na parede.
        </li>
        <li>
          <strong>Resultado.</strong> Veja as áreas na aba <em>Áreas</em>, a casa em <em>3D</em> e exporte a imagem em <em>Exportar PNG</em>.
        </li>
      </ol>
      <p className="modal-text">
        Tudo é salvo automaticamente neste navegador. <kbd>Ctrl+K</kbd> busca qualquer comando e <kbd>?</kbd> mostra os atalhos.
      </p>
      <div className="prompt-actions">
        <button
          type="button"
          className="btn outline"
          onClick={() => {
            dismiss()
            loadSample()
          }}
        >
          Abrir um exemplo
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            dismiss()
            useEditorStore.getState().setTool('room')
          }}
        >
          Começar a desenhar
        </button>
      </div>
    </div>
  )
}
