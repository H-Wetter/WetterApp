import { useState } from 'react'
import { DEFAULT_WINDY_LAYER, WINDY_LAYERS, windyEmbedUrl, windyPageUrl } from '../lib/windyMap'
import type { WeatherLocation } from '../types/location'

const LAYER_KEY = 'wetter-app.windy-layer'

function readLayer(): string {
  try {
    const id = localStorage.getItem(LAYER_KEY)
    return WINDY_LAYERS.some((l) => l.id === id) && id ? id : DEFAULT_WINDY_LAYER
  } catch {
    return DEFAULT_WINDY_LAYER
  }
}

/** Windy-Karte (eingebettet) mit Knöpfen für Radar, Satellit, Regen, Wind usw. */
export function WindyMap({ place }: { place: WeatherLocation }) {
  const [layerId, setLayerId] = useState(readLayer)
  const layer = WINDY_LAYERS.find((l) => l.id === layerId) ?? WINDY_LAYERS[0]

  function choose(id: string) {
    setLayerId(id)
    try {
      localStorage.setItem(LAYER_KEY, id)
    } catch {
      // nicht speicherbar – gilt dann nur bis zum Neuladen
    }
  }

  return (
    <section className="card windy-card">
      <h2>Windy-Karte</h2>
      <div className="windy-layers" role="group" aria-label="Kartenebene wählen">
        {WINDY_LAYERS.map((l) => (
          <button key={l.id} type="button" className={l.id === layer.id ? 'active' : ''} aria-pressed={l.id === layer.id} onClick={() => choose(l.id)}>
            {l.label}
          </button>
        ))}
      </div>
      <iframe
        // neuer key = Karte wird mit der neuen Ebene frisch geladen
        key={`${layer.id}-${place.latitude}-${place.longitude}`}
        className="windy-frame"
        src={windyEmbedUrl(place.latitude, place.longitude, layer)}
        title={`Windy-Karte: ${layer.label}`}
        loading="lazy"
        allowFullScreen
      />
      <p className="small">{layer.note}</p>
      <p className="small muted">
        Karte:{' '}
        <a href="https://www.windy.com/" target="_blank" rel="noopener noreferrer">
          Windy.com
        </a>{' '}
        (eingebettet, kostenlos für private Nutzung) ·{' '}
        <a href={windyPageUrl(place.latitude, place.longitude, layer)} target="_blank" rel="noopener noreferrer">
          Groß bei Windy öffnen ↗
        </a>
      </p>
    </section>
  )
}
