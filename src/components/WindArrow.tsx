import type { WindDirection } from '../lib/wind'

interface Props {
  wind: WindDirection
  size?: number
  /** Himmelsrichtung als Text daneben anzeigen (z. B. „SW“) */
  showName?: boolean
}

/**
 * Windpfeil: zeigt, WOHIN der Wind weht (wie in den meisten Wetter-Apps).
 * Die Beschriftung „SW“ sagt, WOHER er kommt – so wie man vom „Südwestwind“ spricht.
 * Ohne eindeutige Richtung („still“, „wechselnd“) gibt es nur den Text.
 */
export function WindArrow({ wind, size = 14, showName = true }: Props) {
  const title =
    wind.degrees === null || wind.name === 'wechselnd'
      ? `Windrichtung: ${wind.name}`
      : `Wind aus ${wind.name} (${Math.round(wind.degrees)}°)`
  const hasArrow = wind.degrees !== null && wind.name !== 'wechselnd' && wind.name !== 'still'

  return (
    <span className="wind-dir" title={title}>
      {hasArrow && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 24 24"
          aria-hidden="true"
          // Pfeil zeigt ohne Drehung nach unten (= Wind aus Nord weht nach Süden)
          style={{ transform: `rotate(${wind.degrees}deg)` }}
        >
          <path d="M12 22 L5 13 H10 V2 H14 V13 H19 Z" fill="currentColor" />
        </svg>
      )}
      {showName && <span>{wind.name}</span>}
    </span>
  )
}
