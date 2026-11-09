import { describe, expect, it } from 'vitest'
import type { OfficialWarning } from '../types/officialWarning'
import { bulletList, currentWarnings, isActive, warningPeriod } from './officialWarnings'

// Beispiel aus der GeoSphere-Doku: Gelbe Windwarnung 27.03.2023 08:00–18:00 (Sommerzeit)
const wind: OfficialWarning = {
  id: 4149,
  type: 1,
  level: 1,
  start: 1679896800 * 1000,
  end: 1679932800 * 1000,
  text: 'Gelbe Windwarnung von Mo, 27.03.2023 08:00 bis Mo, 27.03.2023 18:00',
  impacts: '* Äste können herabstürzen.\n* Erhöhte Unfallgefahr durch Seitenwind',
  advice: '',
  meteo: '',
}

describe('amtliche Warnungen', () => {
  it('zeigt den Zeitraum in österreichischer Zeit', () => {
    expect(warningPeriod(wind)).toBe('Mo., 27.3., 08:00 – 18:00 Uhr')
  })

  it('erkennt, ob eine Warnung gerade gilt', () => {
    expect(isActive(wind, Date.parse('2023-03-27T10:00:00Z'))).toBe(true)
    expect(isActive(wind, Date.parse('2023-03-27T20:00:00Z'))).toBe(false)
  })

  it('blendet abgelaufene Warnungen aus und sortiert nach Beginn, höhere Stufe zuerst', () => {
    const later = { ...wind, id: 2, start: wind.start! + 86_400_000, end: wind.end! + 86_400_000 }
    const sameStartOrange = { ...wind, id: 3, level: 2 as const }
    const list = currentWarnings([later, wind, sameStartOrange], Date.parse('2023-03-27T07:00:00Z'))
    expect(list.map((w) => w.id)).toEqual([3, 4149, 2])
    expect(currentWarnings([wind], Date.parse('2023-03-28T00:00:00Z'))).toEqual([])
  })

  it('zerlegt Aufzählungen mit „* “ in Punkte', () => {
    expect(bulletList(wind.impacts)).toEqual(['Äste können herabstürzen.', 'Erhöhte Unfallgefahr durch Seitenwind'])
  })
})
