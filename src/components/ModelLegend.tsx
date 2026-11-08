import type { ModelInfo } from '../types/forecast'

interface Props {
  models: ModelInfo[]
  hidden: Set<string>
  /** Reichweite je Modell in Tagen */
  reach: Record<string, number>
  onToggle: (id: string) => void
  onShowAll: () => void
  onHideAll: () => void
}

/** Legende zum Ein-/Ausblenden der Modelle. Klick = umschalten. */
export function ModelLegend({ models, hidden, reach, onToggle, onShowAll, onHideAll }: Props) {
  const visibleCount = models.length - models.filter((m) => hidden.has(m.id)).length

  return (
    <section className="card">
      <div className="legend-head">
        <h3>
          Modelle <span className="muted small">({visibleCount} von {models.length} sichtbar)</span>
        </h3>
        <div className="legend-actions">
          <button type="button" onClick={onShowAll}>Alle</button>
          <button type="button" onClick={onHideAll}>Keine</button>
        </div>
      </div>

      <ul className="legend">
        {models.map((m) => {
          const off = hidden.has(m.id)
          return (
            <li key={m.id}>
              <button
                type="button"
                className={off ? 'legend-item off' : 'legend-item'}
                aria-pressed={!off}
                onClick={() => onToggle(m.id)}
                title={`${m.provider} – Daten für ca. ${reach[m.id]} Tage`}
              >
                <span className="swatch" style={{ background: m.color }} />
                <span>{m.label}</span>
                <span className="muted small">{reach[m.id]} T</span>
              </button>
            </li>
          )
        })}
      </ul>

      <p className="muted small legend-help">
        <span className="key-mean" /> Mittelwert &nbsp; <span className="key-band" /> Streuung (Min–Max) &nbsp;·&nbsp;
        Mittelwert und Streuung rechnen nur mit den sichtbaren Modellen. „T“ = Tage mit Daten.
      </p>
    </section>
  )
}
