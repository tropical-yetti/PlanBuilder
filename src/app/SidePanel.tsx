import { useEditorStore, type SidePanelTab } from '../store/editorStore'
import { AreasPanel } from './AreasPanel'
import { HistoryPanel } from './HistoryPanel'
import { PropertiesPanel } from './PropertiesPanel'

const TABS: { id: SidePanelTab; label: string }[] = [
  { id: 'properties', label: 'Propriedades' },
  { id: 'areas', label: 'Áreas' },
  { id: 'history', label: 'Histórico' },
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
        {tab === 'properties' ? <PropertiesPanel /> : tab === 'areas' ? <AreasPanel /> : <HistoryPanel />}
      </div>
    </section>
  )
}
