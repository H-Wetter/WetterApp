import { useState } from 'react'
import { getBrowserLocation } from '../api/geolocation'
import { LocationCard } from '../components/LocationCard'
import { LocationSearch } from '../components/LocationSearch'
import { LocalForecast } from '../components/LocalForecast'
import { DEFAULT_LOCATION } from '../lib/defaults'
import type { WeatherLocation } from '../types/location'

/**
 * Seite „Lokal“: Beim Start wählt man selbst:
 *  – einen Ort eingeben (z. B. „Wien“ → Wien, Österreich) oder
 *  – den eigenen Standort ermitteln lassen (bei Fehler → Graz).
 */
export function LocalPage() {
  const [location, setLocation] = useState<WeatherLocation | null>(null)
  const [locating, setLocating] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  function locate() {
    setLocating(true)
    setNotice(null)
    getBrowserLocation()
      .then(setLocation)
      .catch((err: unknown) => {
        const reason = err instanceof Error ? err.message : 'Unbekannter Fehler.'
        setNotice(`${reason} Es wird Graz verwendet.`)
        setLocation(DEFAULT_LOCATION)
      })
      .finally(() => setLocating(false))
  }

  function handleSelect(selected: WeatherLocation) {
    setNotice(null)
    setLocation(selected)
  }

  return (
    <div className="page">
      <h1>Lokal</h1>

      {location ? (
        <LocationCard location={location} />
      ) : (
        <p className="intro">Für welchen Ort möchtest du das Wetter sehen?</p>
      )}
      {notice && <p className="notice">{notice}</p>}

      <div className="choice">
        <section className="card">
          <h3>Ort eingeben</h3>
          <LocationSearch onSelect={handleSelect} />
        </section>

        <p className="or">oder</p>

        <section className="card">
          <h3>Standort ermitteln</h3>
          <p className="muted small">Der Browser fragt dich, ob er deinen Standort verwenden darf.</p>
          <button type="button" className="primary" onClick={locate} disabled={locating}>
            {locating ? 'Standort wird ermittelt …' : '📍 Meinen Standort ermitteln'}
          </button>
        </section>
      </div>

      {location && <LocalForecast location={location} />}
    </div>
  )
}
