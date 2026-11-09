import { describe, expect, it } from 'vitest'
import type { Measurement, Station } from '../types/station'
import {
  detectMeasuredFog,
  firstWithData,
  isNearAustria,
  measuredFogWindow,
  measuredInversion,
  mountainStations,
  nearbyStations,
  prettyStationName,
} from './stations'

// Echte Stationen rund um Graz (Koordinaten und Höhen laut GeoSphere)
const station = (id: string, name: string, lat: number, lon: number, altitude: number): Station => ({ id, name, state: 'Steiermark', lat, lon, altitude })
const STRASSGANG = station('11238', 'GRAZ/STRASSGANG', 47.0461, 15.4103, 357)
const THALERHOF = station('11240', 'GRAZ-THALERHOF-FLUGHAFEN', 46.9806, 15.44, 340)
const LENDPLATZ = station('8989103', 'GRAZ LENDPLATZ', 47.0756, 15.4289, 351)
const SCHOECKL = station('11241', 'SCHOECKL', 47.1986, 15.4664, 1443)
const RADEGUND = station('11247', 'ST.RADEGUND', 47.19, 15.49, 726)
const STATIONS = [STRASSGANG, THALERHOF, LENDPLATZ, SCHOECKL, RADEGUND]
const GRAZ = { lat: 47.0673, lon: 15.442, elevation: 362 }

const NOW = Date.parse('2026-11-09T07:30:00Z')

/** Messung mit sinnvollen Standardwerten – nur das Nötige überschreiben */
function measurement(stationId: string, values: Partial<Measurement> = {}): Measurement {
  return {
    stationId,
    time: NOW - 10 * 60 * 1000,
    temp: 1,
    humidity: 80,
    dewPoint: -1,
    wind: 5,
    gust: 10,
    windDirection: 180,
    precipitation: 0,
    sunshine: 0,
    snowDepth: 0,
    ...values,
  }
}

describe('isNearAustria', () => {
  it('erkennt Graz als österreichisch und Paris als nicht', () => {
    expect(isNearAustria(47.07, 15.44)).toBe(true)
    expect(isNearAustria(48.86, 2.35)).toBe(false)
  })
})

describe('nearbyStations', () => {
  it('nimmt nur Stationen mit ähnlicher Höhe, nächste zuerst', () => {
    const ids = nearbyStations(STATIONS, GRAZ.lat, GRAZ.lon, GRAZ.elevation).map((c) => c.station.id)
    // Schöckl (1443 m) und St. Radegund (726 m) liegen zu hoch für „Graz“
    expect(ids).toEqual(['8989103', '11238', '11240'])
  })

  it('zählt ohne bekannte Höhe nur die Entfernung', () => {
    const ids = nearbyStations(STATIONS, GRAZ.lat, GRAZ.lon, undefined).map((c) => c.station.id)
    expect(ids).toContain('11241')
  })
})

describe('firstWithData', () => {
  const candidates = nearbyStations(STATIONS, GRAZ.lat, GRAZ.lon, GRAZ.elevation)

  it('bevorzugt eine vollständige Station vor einer näheren ohne Windmesser', () => {
    const picked = firstWithData(candidates, [measurement('8989103', { wind: null }), measurement('11238')])
    expect(picked?.candidate.station.id).toBe('11238')
  })

  it('nimmt notfalls die nächste Station mit Temperatur', () => {
    const picked = firstWithData(candidates, [measurement('8989103', { wind: null })])
    expect(picked?.candidate.station.id).toBe('8989103')
  })

  it('liefert null, wenn keine Station eine Temperatur hat', () => {
    expect(firstWithData(candidates, [measurement('11238', { temp: null })])).toBeNull()
  })
})

describe('mountainStations', () => {
  it('wählt beim Schöckl die Gipfelstation, nicht die tiefere daneben', () => {
    const ids = mountainStations(STATIONS, 47.1986, 15.4664, 1432, 357).map((c) => c.station.id)
    expect(ids[0]).toBe('11241')
  })

  it('verlangt mindestens 300 m über der Talstation', () => {
    const ids = mountainStations(STATIONS, 47.19, 15.49, 800, 600).map((c) => c.station.id)
    expect(ids).not.toContain('11247') // 726 m ist nur 126 m über 600 m
  })
})

describe('measuredInversion', () => {
  it('erkennt die Inversion vom 09.11.2026 (Graz 0,7 °C, Schöckl 4,4 °C)', () => {
    const r = measuredInversion(0.7, 357, 4.4, 1443)
    expect(r.kind).toBe('inversion')
    expect(r.diff).toBeCloseTo(3.7)
  })

  it('erkennt normale Abnahme mit der Höhe', () => {
    expect(measuredInversion(10, 357, 3, 1443).kind).toBe('normal')
  })

  it('erkennt stabile Schichtung (kaum Abnahme)', () => {
    // üblich wären rund 7 °C weniger, gemessen nur 0,2 °C
    expect(measuredInversion(5.3, 357, 5.1, 1443).kind).toBe('stable')
  })
})

describe('detectMeasuredFog', () => {
  const candidates = nearbyStations(STATIONS, GRAZ.lat, GRAZ.lon, GRAZ.elevation)

  it('findet Nebel auch an einer anderen nahen Talstation (Thalerhof 98 %)', () => {
    const fog = detectMeasuredFog(candidates, [measurement('11238', { humidity: 90 }), measurement('11240', { humidity: 98 })], NOW)
    expect(fog?.stationName).toBe('Graz-Thalerhof-Flughafen')
    expect(fog?.humidity).toBe(98)
  })

  it('meldet keinen Nebel unter 95 %', () => {
    expect(detectMeasuredFog(candidates, [measurement('11240', { humidity: 94 })], NOW)).toBeNull()
  })

  it('meldet keinen Nebel bei Regen', () => {
    expect(detectMeasuredFog(candidates, [measurement('11240', { humidity: 99, precipitation: 0.5 })], NOW)).toBeNull()
  })

  it('ignoriert alte Messungen (älter als eine Stunde)', () => {
    expect(detectMeasuredFog(candidates, [measurement('11240', { humidity: 99, time: NOW - 2 * 60 * 60 * 1000 })], NOW)).toBeNull()
  })

  it('rechnet das Zeitfenster in die Zeitrechnung der Vorhersage um (Ortszeit als UTC)', () => {
    const fog = detectMeasuredFog(candidates, [measurement('11240', { humidity: 98 })], NOW)
    expect(fog).not.toBeNull()
    if (!fog) return
    const w = measuredFogWindow(fog, 3600)
    expect(w.from).toBe(fog.time + 3600 * 1000)
    expect(w.to - w.from).toBe(3 * 60 * 60 * 1000)
  })
})

describe('prettyStationName', () => {
  it('schreibt Stationsnamen lesbar', () => {
    expect(prettyStationName('GRAZ-THALERHOF-FLUGHAFEN')).toBe('Graz-Thalerhof-Flughafen')
    expect(prettyStationName('GRAZ/STRASSGANG')).toBe('Graz/Strassgang')
  })
})
