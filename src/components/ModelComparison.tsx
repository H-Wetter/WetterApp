import type { ModelInfo } from '../types/forecast'
import { ModelLegend } from './ModelLegend'

interface Props {
  open: boolean
  onToggleOpen: () => void
  models: ModelInfo[]
  hidden: Set<string>
  reach: Record<string, number>
  onToggleModel: (id: string) => void
  onShowAll: () => void
  onHideAll: () => void
}

/**
 * Aufklappbarer Modellvergleich. Zugeklappt zeigen die Diagramme nur Mittelwert und Streuband.
 * Aufgeklappt erscheint die Legende, und jedes Modell bekommt seine eigene Linie.
 */
export function ModelComparison({ open, onToggleOpen, models, hidden, reach, onToggleModel, onShowAll, onHideAll }: Props) {
  return (
    <section className="comparison card collapsible">
      <button type="button" className="collapse-toggle" aria-expanded={open} onClick={onToggleOpen}>
        <span>
          <strong>Modellvergleich</strong>
          <span className="muted small"> · {open ? 'einzelne Modelle werden angezeigt' : `${models.length} Modelle einzeln anzeigen`}</span>
        </span>
        <span className="chevron" aria-hidden="true">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="comparison-body">
          <p className="muted small">
            Jedes Modell bekommt in den Diagrammen eine eigene dünne Linie – auch in der Stundenansicht. Klicke auf ein Modell, um es
            aus- oder einzublenden; Mittelwert und Streuband rechnen dann nur mit den sichtbaren Modellen.
          </p>
          <ModelLegend
            models={models}
            hidden={hidden}
            reach={reach}
            onToggle={onToggleModel}
            onShowAll={onShowAll}
            onHideAll={onHideAll}
          />
        </div>
      )}
    </section>
  )
}
