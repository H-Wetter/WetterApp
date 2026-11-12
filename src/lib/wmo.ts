/**
 * WMO-Wettercodes (wie Open-Meteo sie liefert) → Bestandteile eines Symbols und deutscher Name.
 * Die Zeichnung selbst macht src/components/WmoIcon.tsx; hier steht nur, WAS zu sehen ist.
 * Liste der Codes: https://open-meteo.com/en/docs (Abschnitt „WMO Weather interpretation codes“)
 */

export type Precip = 'none' | 'drizzle' | 'rain' | 'snow' | 'sleet' | 'hail'

export interface WmoParts {
  /** Sonne sichtbar? (klar, heiter, Schauer) */
  sun: boolean
  /** Wolke: keine, klein (heiter), hell (bewölkt), grau (bedeckt), dunkel (Regen/Gewitter) */
  cloud: 'none' | 'small' | 'light' | 'gray' | 'dark'
  precip: Precip
  /** Stärke 1–3 (Anzahl Tropfen/Flocken) */
  amount: 1 | 2 | 3
  fog: boolean
  thunder: boolean
  /** gefrierend (Glatteis) */
  freezing: boolean
  label: string
}

const base: WmoParts = { sun: false, cloud: 'none', precip: 'none', amount: 1, fog: false, thunder: false, freezing: false, label: '' }

/** Bestandteile für einen WMO-Code. Unbekannte Codes → bedeckt. */
export function wmoParts(code: number): WmoParts {
  const p = (x: Partial<WmoParts>): WmoParts => ({ ...base, ...x })
  switch (code) {
    case 0:
      return p({ sun: true, label: 'Sonnig' })
    case 1:
      return p({ sun: true, cloud: 'small', label: 'Überwiegend sonnig' })
    case 2:
      return p({ sun: true, cloud: 'light', label: 'Teils bewölkt' })
    case 3:
      return p({ cloud: 'gray', label: 'Bedeckt' })
    case 45:
      return p({ fog: true, label: 'Nebel' })
    case 48:
      return p({ fog: true, freezing: true, label: 'Nebel mit Reif' })
    case 51:
    case 53:
    case 55:
      return p({ cloud: 'light', precip: 'drizzle', amount: code === 51 ? 1 : code === 53 ? 2 : 3, label: code === 55 ? 'Starker Nieselregen' : 'Nieselregen' })
    case 56:
    case 57:
      return p({ cloud: 'dark', precip: 'drizzle', amount: code === 56 ? 2 : 3, freezing: true, label: 'Gefrierender Nieselregen' })
    case 61:
    case 63:
    case 65:
      return p({ cloud: 'dark', precip: 'rain', amount: code === 61 ? 1 : code === 63 ? 2 : 3, label: code === 61 ? 'Leichter Regen' : code === 63 ? 'Regen' : 'Starker Regen' })
    case 66:
    case 67:
      return p({ cloud: 'dark', precip: 'sleet', amount: code === 66 ? 2 : 3, freezing: true, label: 'Gefrierender Regen' })
    case 71:
    case 73:
    case 75:
      return p({ cloud: 'light', precip: 'snow', amount: code === 71 ? 1 : code === 73 ? 2 : 3, label: code === 71 ? 'Leichter Schneefall' : code === 73 ? 'Schneefall' : 'Starker Schneefall' })
    case 77:
      return p({ cloud: 'light', precip: 'hail', amount: 1, label: 'Schneegriesel' })
    case 80:
    case 81:
    case 82:
      return p({ sun: true, cloud: 'dark', precip: 'rain', amount: code === 80 ? 1 : code === 81 ? 2 : 3, label: code === 82 ? 'Heftige Regenschauer' : 'Regenschauer' })
    case 85:
    case 86:
      return p({ sun: true, cloud: 'light', precip: 'snow', amount: code === 85 ? 1 : 3, label: 'Schneeschauer' })
    case 95:
      return p({ cloud: 'dark', thunder: true, label: 'Gewitter' })
    case 96:
    case 99:
      return p({ cloud: 'dark', thunder: true, precip: 'hail', amount: code === 96 ? 2 : 3, label: 'Gewitter mit Hagel' })
    default:
      return p({ cloud: 'gray', label: 'Bewölkt' })
  }
}

/** Alle WMO-Codes, die Open-Meteo liefert (für Tests und die Übersicht) */
export const WMO_CODES = [0, 1, 2, 3, 45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]
