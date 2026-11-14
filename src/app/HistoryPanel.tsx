import { useProjectStore } from '../store/projectStore'

/** Histórico de ações: clicar numa linha volta (ou avança) o projeto até aquele ponto. */
export function HistoryPanel() {
  const past = useProjectStore((s) => s.past)
  const future = useProjectStore((s) => s.future)
  const goTo = useProjectStore((s) => s.goTo)
  // `future` guarda os passos desfeitos, do mais antigo desfeito ao mais recente no fim.
  const steps = [...past.map((e) => e.label), ...[...future].reverse().map((e) => e.label)]

  if (steps.length === 0) return <p className="empty">Nada foi feito ainda. Cada ação aparece aqui e pode ser desfeita.</p>

  return (
    <div className="history">
      <button type="button" className={`history-row ${past.length === 0 ? 'current' : ''}`} onClick={() => goTo(0)}>
        Início
      </button>
      {steps.map((label, i) => (
        <button
          key={i}
          type="button"
          className={`history-row ${i + 1 === past.length ? 'current' : ''} ${i + 1 > past.length ? 'undone' : ''}`}
          title={i + 1 > past.length ? 'Desfeito — clique para refazer até aqui' : 'Clique para voltar a este ponto'}
          onClick={() => goTo(i + 1)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
