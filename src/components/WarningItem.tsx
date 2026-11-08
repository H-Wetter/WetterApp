import { LEVEL_NAME, type WarnKind, type Warning } from '../lib/warnings'
import { formatHour } from '../lib/time'

const KIND_ICON: Record<WarnKind, string> = {
  thunder: '⚡',
  gust: '🌬️',
  snow: '❄️',
  ice: '🧊',
}

/** Zeitfenster als Text, z. B. „13–17 Uhr“ */
function timeText(w: Warning): string {
  if (w.from === null || w.to === null) return ''
  const from = formatHour(w.from).slice(0, 2)
  const to = formatHour(w.to + 60 * 60 * 1000).slice(0, 2)
  return from === to ? `um ${from} Uhr` : `${Number(from)}–${Number(to) === 0 ? 24 : Number(to)} Uhr`
}

interface Props {
  warning: Warning
  dayLabel?: string
  /** Wenn gesetzt, ist die Warnung anklickbar (z. B. öffnet den Tag) */
  onClick?: () => void
}

/** Eine Warnung: farbiger Rand nach Stufe, Titel, Beschreibung, Zeitfenster, Modellanzahl. */
export function WarningItem({ warning, dayLabel, onClick }: Props) {
  const content = <WarningContent warning={warning} dayLabel={dayLabel} />
  return (
    <li className={`warning level-${warning.level}`}>
      {onClick ? (
        <button type="button" className="warning-button" onClick={onClick} title="Tag in der Stundenansicht öffnen">
          {content}
        </button>
      ) : (
        <div className="warning-body">{content}</div>
      )}
    </li>
  )
}

function WarningContent({ warning, dayLabel }: { warning: Warning; dayLabel?: string }) {
  const time = timeText(warning)
  return (
    <>
      <span className="warning-icon" aria-hidden="true">
        {KIND_ICON[warning.kind]}
      </span>
      <span className="warning-text">
        <span className="warning-title">
          {dayLabel && <span className="warning-day">{dayLabel}: </span>}
          <strong>{warning.title}</strong>
          <span className="warning-level"> (Stufe {LEVEL_NAME[warning.level]})</span>
          {time && <span className="muted"> · {time}</span>}
        </span>
        <span className="small warning-detail">
          {warning.detail}
          {warning.total > 0 && warning.kind !== 'thunder' && (
            <span className="muted">
              {' '}
              ({warning.hits} von {warning.total} Modellen)
            </span>
          )}
        </span>
      </span>
    </>
  )
}
