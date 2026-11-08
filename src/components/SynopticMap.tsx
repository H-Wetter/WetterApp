import { useMemo } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { CircleMarker, MapContainer, Marker, Pane, Polygon, Polyline, TileLayer, Tooltip } from 'react-leaflet'
import { ISOBAR_STEP, Z500_STEP, isobands, isolines, pressureCenters, z500Color } from '../lib/synoptic'
import type { SynopticGrid } from '../types/synoptic'
import type { WeatherLocation } from '../types/location'

interface Props {
  grid: SynopticGrid
  timeIndex: number
  location: WeatherLocation
}

/** Beschriftung als kleines HTML-Etikett (Leaflet „divIcon“). */
function labelIcon(text: string, className: string): L.DivIcon {
  return L.divIcon({ className: `syn-label ${className}`, html: `<span>${text}</span>`, iconSize: [0, 0] })
}

/** Karte: Farbfläche = 500-hPa-Geopotential, Linien = Isobaren, H/T = Druckzentren. */
export function SynopticMap({ grid, timeIndex, location }: Props) {
  const pressure = grid.pressure[timeIndex]
  const z500 = grid.z500[timeIndex]

  const bands = useMemo(() => isobands(grid, z500, Z500_STEP), [grid, z500])
  const isobars = useMemo(() => isolines(grid, pressure, ISOBAR_STEP), [grid, pressure])
  const centers = useMemo(() => pressureCenters(grid, pressure), [grid, pressure])

  // Beschriftung der Isobaren: in der Mitte jeder längeren Linie
  const isobarLabels = useMemo(
    () =>
      isobars.flatMap((iso) =>
        iso.lines.filter((line) => line.length >= 40).map((line, i) => ({ key: `${iso.value}-${i}`, value: iso.value, pos: line[Math.floor(line.length / 2)] })),
      ),
    [isobars],
  )

  const bounds: L.LatLngBoundsExpression = [
    [grid.lats[grid.lats.length - 1], grid.lons[0]],
    [grid.lats[0], grid.lons[grid.lons.length - 1]],
  ]

  return (
    <MapContainer className="syn-map" bounds={bounds} maxBounds={[[25, -40], [80, 60]]} minZoom={2} maxZoom={7} zoomSnap={0.25} zoomDelta={0.5} scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · Wetterdaten: <a href="https://open-meteo.com/">Open-Meteo</a> (ECMWF)'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Eigene Ebene mit Transparenz: Die Stufen liegen deckend übereinander, die Ebene als Ganzes ist halb durchsichtig. */}
      <Pane name="z500" style={{ zIndex: 350, opacity: 0.45 }}>
        {bands.map((band) => (
          <Polygon
            key={band.value}
            positions={band.polygons}
            pane="z500"
            interactive={false}
            pathOptions={{ stroke: false, fillColor: z500Color(band.value), fillOpacity: 1 }}
          />
        ))}
      </Pane>

      {isobars.map((iso) => (
        <Polyline
          key={iso.value}
          positions={iso.lines}
          pathOptions={{ color: '#1c2430', weight: iso.value % 20 === 0 ? 2.2 : 1.2, opacity: 0.85 }}
        >
          <Tooltip sticky>{iso.value} hPa</Tooltip>
        </Polyline>
      ))}

      {isobarLabels.map((l) => (
        <Marker key={l.key} position={l.pos} icon={labelIcon(String(l.value), 'syn-isobar')} interactive={false} />
      ))}

      {centers.map((c) => (
        <Marker
          key={`${c.kind}-${c.lat}-${c.lon}`}
          position={[c.lat, c.lon]}
          icon={labelIcon(`${c.kind}<small>${Math.round(c.value)}</small>`, c.kind === 'H' ? 'syn-high' : 'syn-low')}
        >
          <Tooltip>
            {c.kind === 'H' ? 'Hochdruckgebiet' : 'Tiefdruckgebiet'}, Kerndruck ca. {Math.round(c.value)} hPa
          </Tooltip>
        </Marker>
      ))}

      <CircleMarker
        center={[location.latitude, location.longitude]}
        radius={6}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: '#2f6fdd', fillOpacity: 1 }}
      >
        <Tooltip>{location.name}</Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}
