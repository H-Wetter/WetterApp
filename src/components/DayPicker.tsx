import { useEffect, useRef } from 'react'
import { formatDay } from '../lib/time'
import { WmoIcon } from './WmoIcon'

interface Props {
  days: { dayStart: number; code: number | null }[]
  selected: number
  onSelect: (index: number) => void
}

/**
 * Tagesauswahl über der Österreich-Karte: 7 Tage mit Wochentag, Datum und kleinem Symbol
 * (häufigstes Wetter über alle Orte). Am Handy seitlich wischbar.
 */
export function DayPicker({ days, selected, onSelect }: Props) {
  const listRef = useRef<HTMLDivElement>(null)

  // Gewählten Tag ins Bild schieben (am Handy, wenn er rechts außerhalb liegt)
  useEffect(() => {
    const el = listRef.current?.children[selected] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [selected])

  return (
    <div className="day-picker" role="group" aria-label="Tag wählen" ref={listRef}>
      {days.map((d, i) => (
        <button
          key={d.dayStart}
          type="button"
          className={i === selected ? 'dp-day selected' : 'dp-day'}
          aria-pressed={i === selected}
          onClick={() => onSelect(i)}
        >
          <span className="dp-label">{i === 0 ? 'Heute' : formatDay(d.dayStart).split(' ')[0]}</span>
          <span className="dp-date">{formatDay(d.dayStart).split(' ')[1]}</span>
          {d.code !== null && <WmoIcon code={d.code} size={30} />}
        </button>
      ))}
    </div>
  )
}
