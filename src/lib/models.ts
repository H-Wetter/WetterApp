import type { ModelInfo } from '../types/forecast'

/**
 * Modelle für den 7-Tage-Vergleich. Am 08.11.2026 gegen die Open-Meteo-API geprüft.
 *
 * Bewusst NICHT dabei:
 * – metno_seamless: deckt nur Skandinavien ab, liefert in Mitteleuropa reine ECMWF-Werte (Doppelzählung).
 * – knmi_/dmi_/geosphere_seamless: füllen nach 2–3 Tagen mit ECMWF auf → stattdessen die reinen Regionalmodelle.
 * – icon_d2: steckt in dwd_icon_seamless bereits drin (erste ~2 Tage).
 * – kma_*, bom_access_global: eingestellt, liefern keine Daten mehr.
 */
export const COMPARISON_MODELS: ModelInfo[] = [
  { id: 'dwd_icon_seamless', label: 'ICON', provider: 'DWD (Deutschland)', color: '#1f77b4' },
  { id: 'ecmwf_ifs', label: 'ECMWF IFS', provider: 'ECMWF (Europa)', color: '#d62728' },
  { id: 'ecmwf_aifs025_single', label: 'ECMWF AIFS (KI)', provider: 'ECMWF (Europa)', color: '#ff7f0e' },
  { id: 'gfs_seamless', label: 'GFS', provider: 'NOAA (USA)', color: '#2ca02c' },
  { id: 'gem_seamless', label: 'GEM', provider: 'Kanada', color: '#9467bd' },
  { id: 'ukmo_seamless', label: 'UKMO', provider: 'Met Office (UK)', color: '#8c564b' },
  { id: 'jma_seamless', label: 'JMA', provider: 'Japan', color: '#e377c2' },
  { id: 'cma_grapes_global', label: 'CMA GRAPES', provider: 'China', color: '#7f7f7f' },
  { id: 'meteoswiss_icon_seamless', label: 'MeteoSwiss ICON', provider: 'Schweiz', color: '#bcbd22' },
  { id: 'meteofrance_seamless', label: 'Météo-France', provider: 'Frankreich', color: '#17becf' },
  { id: 'italia_meteo_arpae_icon_2i', label: 'ICON-2I', provider: 'ItaliaMeteo', color: '#006400' },
  { id: 'chmi_aladin_central_europe_2km', label: 'ALADIN', provider: 'CHMI (Tschechien)', color: '#b8860b' },
  { id: 'knmi_harmonie_arome_europe', label: 'KNMI Harmonie', provider: 'Niederlande', color: '#ff1493' },
  { id: 'geosphere_claef_austria', label: 'C-LAEF', provider: 'GeoSphere Austria', color: '#dc143c' },
  { id: 'dmi_harmonie_arome_europe', label: 'DMI Harmonie', provider: 'Dänemark', color: '#4169e1' },
]

/**
 * Modelle, die Bewölkung auf Druckniveaus liefern (für den Wolkenschnitt). Am 08.11.2026 geprüft:
 * ECMWF IFS, MeteoSwiss und DMI liefern dort nichts – die fragen wir gar nicht erst ab.
 */
const NO_PRESSURE_LEVEL_CLOUDS = new Set(['ecmwf_ifs', 'meteoswiss_icon_seamless', 'dmi_harmonie_arome_europe'])
export const CLOUD_PROFILE_MODELS = COMPARISON_MODELS.filter((m) => !NO_PRESSURE_LEVEL_CLOUDS.has(m.id))

export function findModel(id: string): ModelInfo | undefined {
  return COMPARISON_MODELS.find((m) => m.id === id)
}
