import { CATEGORIES } from './categories'

export function LibraryPanel() {
  return (
    <section className="panel library" aria-label="Biblioteca">
      <h2 className="panel-title">Biblioteca</h2>
      <input className="search" type="search" placeholder="Buscar componentes…" disabled />
      <ul className="categories">
        {CATEGORIES.map((c) => (
          <li key={c.id} className={c.available ? '' : 'soon'}>
            <span>{c.name}</span>
            <span className="badge">{c.available ? '0' : 'em breve'}</span>
          </li>
        ))}
      </ul>
      <p className="empty">Os componentes de portas e janelas chegam na fase 2.</p>
    </section>
  )
}
