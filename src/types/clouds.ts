import type { Series } from './forecast'

/** Druckniveaus (hPa), von unten nach oben. Grob: 925 ≈ 800 m, 850 ≈ 1500 m, 700 ≈ 3000 m, 500 ≈ 5500 m, 300 ≈ 9000 m. */
export const PRESSURE_LEVELS = [1000, 925, 850, 700, 600, 500, 400, 300, 250, 200] as const
export type PressureLevel = (typeof PRESSURE_LEVELS)[number]

/** Niveaus, für die wir den Wind abfragen (für die Zugrichtung der Wolken). 925 hPa ≈ 800 m – wichtig für Hochnebel. */
export const WIND_LEVELS = [925, 850, 700, 500, 300] as const
export type WindLevel = (typeof WIND_LEVELS)[number]

/** Rohdaten für den Wolkenschnitt – Werte je Variable und Modell (wie bei MultiModelForecast). */
export interface CloudProfileRaw {
  times: number[]
  utcOffsetSeconds: number
  /** Geländehöhe des Ortes (m über dem Meer), wie Open-Meteo sie verwendet */
  elevation: number
  /** data[variable][modelId], z. B. data['cloud_cover_850hPa']['gfs_seamless'] */
  data: Record<string, Record<string, Series>>
  /** Modelle, die Wolken auf Druckniveaus liefern */
  availableModels: string[]
}
