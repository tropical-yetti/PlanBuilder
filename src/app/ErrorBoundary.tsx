import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * Última barreira: se algo inesperado quebrar a tela, mostra uma explicação em vez de uma página em branco.
 * O projeto está no salvamento automático do navegador, então recarregar o traz de volta.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro inesperado no PlanBuilder:', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="crash" role="alert">
        <h1>Algo deu errado</h1>
        <p>
          O app encontrou um erro inesperado. Seu projeto foi salvo automaticamente neste navegador: recarregue a página para continuar de onde parou.
        </p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          Recarregar
        </button>
        <details>
          <summary>Detalhes técnicos</summary>
          <pre>{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
