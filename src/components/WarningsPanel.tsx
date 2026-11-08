import type { Warning } from '../lib/warnings'
import { formatDate, relativeDayName } from '../lib/time'
import { WarningItem } from './WarningItem'

interface Props {
  warnings: Warning[]
  /** für wie viele Tage geprüft wurde */
  days: number
  now: number
  /** Klick auf einen Hinweis öffnet den Tag in der Stundenansicht */
  onSelectDay: (dayStart: number) => void
}

/** Übersicht aller Warnhinweise der nächsten Tage (oben auf der Seite „Lokal“). */
export function WarningsPanel({ warnings, days, now, onSelectDay }: Props) {
  if (warnings.length === 0) {
    return (
      <p className="warnings-none">
        ✓ Keine Warnhinweise für die nächsten {days} Tage (Gewitter, Sturm, Schnee, Glätte).
      </p>
    )
  }

  return (
    <section className="card warnings-panel" aria-label="Warnhinweise">
      <h2>Hinweise – nächste {days} Tage</h2>
      <ul className="warnings">
        {warnings.map((w) => (
          <WarningItem
            key={`${w.dayStart}-${w.kind}`}
            warning={w}
            dayLabel={`${relativeDayName(w.dayStart, now)} ${formatDate(w.dayStart)}`}
            onClick={() => onSelectDay(w.dayStart)}
          />
        ))}
      </ul>
      <p className="muted small">
        Hinweise aus den Wettermodellen – <strong>keine amtliche Warnung</strong>. Amtliche Unwetterwarnungen für Österreich gibt
        GeoSphere Austria heraus. Stufen: gelb → orange → rot → violett. Klick auf einen Hinweis öffnet den Tag.
      </p>
    </section>
  )
}
