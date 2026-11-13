import { useEditorStore, type SidePanelTab } from '../store/editorStore'
import { WallProperties } from './WallProperties'

const TABS: { id: SidePanelTab; label: string }[] = [
  { id: 'properties', label: 'Propriedades' },
  { id: 'areas', label: 'Áreas' },
]

export function SidePanel() {
  const tab = useEditorStore((s) => s.sidePanelTab)
  const setTab = useEditorStore((s) => s.setSidePanelTab)
  return (
    <section className="panel side" aria-label="Painel lateral">
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="tab-body" role="tabpanel">
        {tab === 'properties' ? (
          <WallProperties />
        ) : (
          <p className="empty">Desenhe cômodos fechados para ver a área total, a área útil e a área de paredes.</p>
        )}
      </div>
    </section>
  )
}
