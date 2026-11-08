/**
 * Wettersymbole aus „Meteocons“ von Bas Milius (https://meteocons.com), MIT-Lizenz.
 * Wir verwenden die statischen Versionen im Stil „fill“ aus dem Paket @bybas/weather-icons.
 * Beim Bauen werden die Bilder direkt in die App eingebettet (kein Nachladen aus dem Internet).
 */
import clearDay from '@bybas/weather-icons/design/fill/export/wi_clear-day.svg'
import cloudy from '@bybas/weather-icons/design/fill/export/wi_cloudy.svg'
import drizzle from '@bybas/weather-icons/design/fill/export/wi_drizzle.svg'
import fog from '@bybas/weather-icons/design/fill/export/wi_fog.svg'
import moonFirstQuarter from '@bybas/weather-icons/design/fill/export/wi_moon-first-quarter.svg'
import moonFull from '@bybas/weather-icons/design/fill/export/wi_moon-full.svg'
import moonLastQuarter from '@bybas/weather-icons/design/fill/export/wi_moon-last-quarter.svg'
import moonNew from '@bybas/weather-icons/design/fill/export/wi_moon-new.svg'
import moonWaningCrescent from '@bybas/weather-icons/design/fill/export/wi_moon-waning-crescent.svg'
import moonWaningGibbous from '@bybas/weather-icons/design/fill/export/wi_moon-waning-gibbous.svg'
import moonWaxingCrescent from '@bybas/weather-icons/design/fill/export/wi_moon-waxing-crescent.svg'
import moonWaxingGibbous from '@bybas/weather-icons/design/fill/export/wi_moon-waxing-gibbous.svg'
import overcast from '@bybas/weather-icons/design/fill/export/wi_overcast.svg'
import overcastDay from '@bybas/weather-icons/design/fill/export/wi_overcast-day.svg'
import overcastNight from '@bybas/weather-icons/design/fill/export/wi_overcast-night.svg'
import partlyDay from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-day.svg'
import partlyDaySleet from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-day-sleet.svg'
import partlyDaySnow from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-day-snow.svg'
import partlyNight from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-night.svg'
import partlyNightSleet from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-night-sleet.svg'
import partlyNightSnow from '@bybas/weather-icons/design/fill/export/wi_partly-cloudy-night-snow.svg'
import rain from '@bybas/weather-icons/design/fill/export/wi_rain.svg'
import raindrop from '@bybas/weather-icons/design/fill/export/wi_raindrop.svg'
import raindrops from '@bybas/weather-icons/design/fill/export/wi_raindrops.svg'
import sleet from '@bybas/weather-icons/design/fill/export/wi_sleet.svg'
import starryNight from '@bybas/weather-icons/design/fill/export/wi_starry-night.svg'
import snow from '@bybas/weather-icons/design/fill/export/wi_snow.svg'
import snowflake from '@bybas/weather-icons/design/fill/export/wi_snowflake.svg'
import sunrise from '@bybas/weather-icons/design/fill/export/wi_sunrise.svg'
import sunset from '@bybas/weather-icons/design/fill/export/wi_sunset.svg'
import thermometer from '@bybas/weather-icons/design/fill/export/wi_thermometer.svg'
import thunder from '@bybas/weather-icons/design/fill/export/wi_thunderstorms-rain.svg'
import wind from '@bybas/weather-icons/design/fill/export/wi_wind.svg'
import type { WeatherSymbol } from '../lib/weatherSymbol'

/** Mondphasen in der Reihenfolge des Zyklus (Neumond → … → abnehmende Sichel). */
const MOON_PHASES = [
  moonNew,
  moonWaxingCrescent,
  moonFirstQuarter,
  moonWaxingGibbous,
  moonFull,
  moonWaningGibbous,
  moonLastQuarter,
  moonWaningCrescent,
]

/** Bild für eine Mondphase 0–1 (auf die nächste der 8 Phasen gerundet). */
function moonImage(phase: number): string {
  return MOON_PHASES[Math.round(phase * 8) % 8]
}

/** Hauptbild und optional ein kleines Abzeichen (für „stark“) zu einem Wettersymbol. */
function pickImages(symbol: WeatherSymbol): { main: string; badge?: string } {
  const day = symbol.isDay
  switch (symbol.condition) {
    case 'thunder':
      return { main: thunder }
    case 'fog':
      return { main: fog }
    case 'clear': {
      if (day) return { main: clearDay }
      // Klare Nacht: der Mond in seiner tatsächlichen Phase.
      // Bei Neumond ist der Mond unsichtbar (nur ein blasser Kreis) – dann lieber die Sternennacht.
      const moon = moonImage(symbol.moonPhase)
      return { main: moon === moonNew ? starryNight : moon }
    }
    case 'partly':
      return { main: day ? partlyDay : partlyNight }
    case 'mostly':
      return { main: day ? overcastDay : overcastNight }
    case 'cloudy':
      return { main: cloudy }
    case 'overcast':
      return { main: overcast }
    case 'precip': {
      const p = symbol.precip
      if (!p) return { main: rain }
      if (p.kind === 'rain') {
        if (p.intensity === 1) return { main: drizzle }
        if (p.intensity === 2) return { main: rain }
        return { main: rain, badge: raindrops }
      }
      if (p.kind === 'snow') {
        if (p.intensity === 1) return { main: day ? partlyDaySnow : partlyNightSnow }
        if (p.intensity === 2) return { main: snow }
        return { main: snow, badge: snowflake }
      }
      // Schneeregen
      if (p.intensity === 1) return { main: day ? partlyDaySleet : partlyNightSleet }
      if (p.intensity === 2) return { main: sleet }
      return { main: sleet, badge: raindrops }
    }
  }
}

interface Props {
  symbol: WeatherSymbol
  /** Größe in Pixel */
  size?: number
}

/** Wettersymbol (Meteocons). Bei „stark“ kommt ein kleines Abzeichen rechts unten dazu. */
export function WeatherIcon({ symbol, size = 32 }: Props) {
  const { main, badge } = pickImages(symbol)
  return (
    <span className="wi" style={{ width: size, height: size }} role="img" aria-label={symbol.label} title={symbol.label}>
      <img src={main} width={size} height={size} alt="" draggable={false} />
      {badge && <img className="wi-badge" src={badge} width={size * 0.5} height={size * 0.5} alt="" draggable={false} />}
    </span>
  )
}

/** Mondphasen-Symbol (z. B. in den Kacheln). */
export function MoonIcon({ phase, size = 16, label }: { phase: number; size?: number; label: string }) {
  return <img className="wi-small" src={moonImage(phase)} width={size} height={size} alt={label} title={label} />
}

/** Kleine Zusatzsymbole für Kacheln und Stundenansicht. */
const SMALL = { raindrop, sun: clearDay, wind, thermometer, sunrise, sunset } as const
export type SmallIconName = keyof typeof SMALL

export function SmallIcon({ name, size = 18, label }: { name: SmallIconName; size?: number; label?: string }) {
  return <img className="wi-small" src={SMALL[name]} width={size} height={size} alt={label ?? ''} aria-hidden={label ? undefined : true} />
}
