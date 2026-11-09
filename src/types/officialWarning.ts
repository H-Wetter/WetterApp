/** Art der amtlichen Warnung (Nummern wie bei GeoSphere Austria) */
export type OfficialWarningType = 1 | 2 | 3 | 4 | 5 | 6 | 7

/** Warnstufe: 1 = gelb, 2 = orange, 3 = rot */
export type OfficialWarningLevel = 1 | 2 | 3

/** Eine amtliche Wetterwarnung von GeoSphere Austria für eine Gemeinde. */
export interface OfficialWarning {
  id: number
  type: OfficialWarningType
  level: OfficialWarningLevel
  /** Beginn und Ende (echte UTC-Zeit, ms) – `null`, wenn unbekannt */
  start: number | null
  end: number | null
  /** z. B. „Gelbe Windwarnung von Mo, 27.03.2023 08:00 bis Mo, 27.03.2023 18:00“ */
  text: string
  /** Mögliche Auswirkungen (Aufzählung mit „* “ am Zeilenanfang) */
  impacts: string
  /** Empfehlungen, wie man sich schützt */
  advice: string
  /** Wetterlage in Worten (von den Meteorologinnen und Meteorologen) */
  meteo: string
}

export interface OfficialWarnings {
  /** Gemeinde, für die gewarnt wird, z. B. „Graz“ – `null`, wenn der Ort in keiner österreichischen Gemeinde liegt */
  municipality: string | null
  warnings: OfficialWarning[]
}
