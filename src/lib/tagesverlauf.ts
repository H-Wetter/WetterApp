import type { MultiModelForecast } from '../types/forecast'
import type { HourInversion } from './inversion'

/**
 * Textueller Tagesverlauf (CLAUDE.md, Etappe 11)
 * ================================================
 * Beschreibt einen Tag in vier Abschnitten mit 1–3 Sätzen – regelbasiert aus Textbausteinen.
 *
 * So wird gerechnet:
 * 1. Für jedes Modell werden die Stunden eines Abschnitts zusammengefasst (z. B. Regensumme 14–18 Uhr).
 * 2. Über alle Modelle wird gemittelt („Mittelwert aller Modelle“). Zusätzlich merken wir uns die Streuung:
 *    wie viele Modelle Regen bringen, wie weit die Temperaturen auseinanderliegen usw.
 * 3. Aus diesen Zahlen wählen die Regeln unten die passenden Textbausteine.
 *
 * Alle Schwellenwerte stehen gesammelt hier oben – zum Anpassen einfach die Zahl ändern.
 */

// ---------- Abschnitte des Tages (Stunden in Ortszeit, „bis“ ausschließlich) ----------

export const PERIODS = [
  { key: 'vormittag', label: 'Vormittag', from: 6, to: 11, when: 'am Vormittag' },
  { key: 'mittag', label: 'Mittag', from: 11, to: 14, when: 'zu Mittag' },
  { key: 'nachmittag', label: 'Nachmittag', from: 14, to: 18, when: 'am Nachmittag' },
  { key: 'abend', label: 'Abend', from: 18, to: 22, when: 'am Abend' },
] as const

// ---------- Schwellenwerte ----------

/** Bewölkung in % (Mittel des Abschnitts): darunter gilt … */
const CLOUD = {
  /** sonnig bzw. klar */
  clear: 20,
  /** heiter, lockere Wolken */
  few: 50,
  /** wechselnd bis stark bewölkt – darüber bedeckt */
  broken: 80,
}

/** Niederschlag in mm, summiert über den Abschnitt (Mittel der Modelle) */
const PRECIP = {
  /** darunter: trocken */
  trace: 0.1,
  /** bis hier: nur ein paar Tropfen / leicht */
  light: 1,
  /** bis hier: Regen – darüber: kräftig */
  moderate: 5,
}
/** Ab so viel mm im Abschnitt zählt ein Modell als „bringt Regen“ */
const WET_MODEL_MM = 0.2
/** Bringen weniger als so viele Modelle Regen, gilt der Abschnitt als trocken (auch wenn das Mittel knapp darüber liegt) */
const WET_SHARE_DRY = 0.3
/** Liegt der Anteil der Modelle mit Regen zwischen diesen Werten, sind sie sich uneinig */
const WET_SHARE_UNSURE = [0.3, 0.7] as const

/** Schnee: Anteil des Niederschlags, der als Schnee fällt (Schnee in cm × 0,7 ≈ mm Wasser) */
const SNOW_SHARE = {
  /** ab hier: Schneeregen */
  mixed: 0.25,
  /** ab hier: Schnee */
  snow: 0.65,
}
const SNOW_CM_TO_MM = 0.7

/** Temperatur in °C */
const TEMP = {
  /** ab so viel Änderung im Abschnitt: „steigt“ bzw. „sinkt“ */
  trend: 2,
  /** liegen die Modelle mehr als so weit auseinander: „uneinig“ */
  spread: 4,
  /** bis hier: frostig */
  frost: 0,
  /** ab hier: heiß */
  hot: 30,
}

/** Bewölkung: liegen die Modelle mehr als so viele %-Punkte auseinander: „uneinig“ */
const CLOUD_SPREAD = 60

/** Wind in km/h */
const WIND = {
  /** mittlerer Wind ab hier: lebhaft */
  breezy: 20,
  /** mittlerer Wind ab hier: kräftig */
  strong: 35,
  /** Böen ab hier erwähnen */
  gust: 45,
  /** Böen ab hier: Sturmböen */
  storm: 75,
}

/** Gewitter: Anteil der Modelle, die im Abschnitt einen Gewitter-Wettercode (95–99) zeigen */
const THUNDER = {
  possible: 0.3,
  likely: 0.6,
  /** CAPE (J/kg), ab dem schon wenige Modelle mit Gewittercode reichen */
  cape: 1000,
  /** … und wie viele es dann mindestens sein müssen */
  capeShare: 0.15,
  /** CAPE ab hier im Text nennen */
  mentionCape: 500,
}

/** Nebel: Anteil der Modell-Stunden mit Nebel-Wettercode (45, 48) */
const FOG_SHARE = 0.4

/** Gipfel gilt als „über dem Nebel“, wenn er mindestens so viel über der Nebelobergrenze liegt (m) */
const ABOVE_FOG_M = 100

// ---------- Zusammenfassung eines Abschnitts ----------

export interface PeriodStats {
  /** Modelle mit Daten in diesem Abschnitt */
  models: number
  /** Bewölkung in % (Mittel) und Streuung (größtes − kleinstes Modell) */
  cloud: number
  cloudSpread: number
  /** nach Sonnenuntergang? */
  night: boolean
  /** Niederschlagssumme in mm (Mittel der Modelle) */
  precip: number
  /** Anteil der Modelle mit Niederschlag (0–1) */
  wetShare: number
  wetModels: number
  /** Schneefall in cm (Mittel) */
  snow: number
  /** Temperatur zu Beginn/Ende des Abschnitts und Mittel (°C, Mittel der Modelle) */
  tempStart: number
  tempEnd: number
  tempMean: number
  /** Streuung der Abschnittsmittel über die Modelle (°C) */
  tempSpread: number
  /** mittlerer Wind und Böen (km/h) */
  wind: number
  gust: number
  /** Anteil der Modelle mit Gewittercode */
  thunderShare: number
  /** höchstes CAPE im Abschnitt (Median der Modelle), `null` = nicht abgefragt */
  cape: number | null
  /** Anteil der Modell-Stunden mit Nebelcode */
  fogShare: number
}

function mean(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const s = [...values].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

function nums(list: (number | null | undefined)[]): number[] {
  return list.filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
}

/**
 * Fasst die Stunden [from, to) aller Modelle zusammen.
 * @param cloudOverride eigene Bewölkung je Modell und Stunde (z. B. nur mittlere + hohe Wolken am Gipfel)
 */
export function periodStats(
  fc: MultiModelForecast,
  modelIds: string[],
  from: number,
  to: number,
  cloudOverride?: (id: string, i: number) => number | null,
): PeriodStats | null {
  const hours: number[] = []
  for (let i = from; i < to && i < fc.times.length; i++) hours.push(i)
  if (hours.length === 0) return null

  const d = fc.data
  const perModel = modelIds
    .map((id) => {
      const temps = hours.map((i) => d.temperature_2m[id]?.[i] ?? null)
      if (nums(temps).length < hours.length / 2) return null // Modell reicht nicht bis hierher
      const cloud = nums(hours.map((i) => (cloudOverride ? cloudOverride(id, i) : (d.cloud_cover[id]?.[i] ?? null))))
      const precip = nums(hours.map((i) => d.precipitation[id]?.[i])).reduce((a, b) => a + b, 0)
      const codes = nums(hours.map((i) => d.weather_code[id]?.[i]))
      const capes = nums(hours.map((i) => fc.extra.cape?.[id]?.[i]))
      return {
        temps,
        tempMean: mean(nums(temps)),
        cloud: mean(cloud),
        precip,
        snow: nums(hours.map((i) => d.snowfall[id]?.[i])).reduce((a, b) => a + b, 0),
        wind: mean(nums(hours.map((i) => d.wind_speed_10m[id]?.[i]))),
        gust: Math.max(0, ...nums(hours.map((i) => d.wind_gusts_10m[id]?.[i]))),
        thunder: codes.some((c) => c >= 95),
        fogHours: codes.filter((c) => c === 45 || c === 48).length,
        codeHours: codes.length,
        cape: capes.length ? Math.max(...capes) : null,
        night: mean(nums(hours.map((i) => d.is_day[id]?.[i]))) < 0.5,
      }
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)

  if (perModel.length === 0) return null

  // Temperatur am Anfang und Ende: Mittel der Modelle in der ersten bzw. letzten Stunde
  const tempAt = (k: number) => mean(nums(perModel.map((m) => m.temps[k])))
  const wet = perModel.filter((m) => m.precip >= WET_MODEL_MM).length
  const capes = nums(perModel.map((m) => m.cape))

  return {
    models: perModel.length,
    cloud: mean(perModel.map((m) => m.cloud)),
    cloudSpread: Math.max(...perModel.map((m) => m.cloud)) - Math.min(...perModel.map((m) => m.cloud)),
    night: perModel.filter((m) => m.night).length > perModel.length / 2,
    precip: mean(perModel.map((m) => m.precip)),
    wetShare: wet / perModel.length,
    wetModels: wet,
    snow: mean(perModel.map((m) => m.snow)),
    tempStart: tempAt(0),
    tempEnd: tempAt(hours.length - 1),
    tempMean: mean(perModel.map((m) => m.tempMean)),
    tempSpread: Math.max(...perModel.map((m) => m.tempMean)) - Math.min(...perModel.map((m) => m.tempMean)),
    wind: mean(perModel.map((m) => m.wind)),
    gust: mean(perModel.map((m) => m.gust)),
    thunderShare: perModel.filter((m) => m.thunder).length / perModel.length,
    cape: capes.length ? median(capes) : null,
    fogShare: perModel.reduce((a, m) => a + m.fogHours, 0) / Math.max(1, perModel.reduce((a, m) => a + m.codeHours, 0)),
  }
}

// ---------- Abwechslung: Formulierung wählen ----------

/** Schon benutzte Formulierungen des aktuell beschriebenen Tages (siehe describeDayCourse) */
let usedToday: Set<string> | null = null

/**
 * Wählt eine Formulierung „zufällig“, aber reproduzierbar: Derselbe Tag ergibt immer denselben Text
 * (kein Flackern beim Neuzeichnen), ein anderer Tag oder Abschnitt meist eine andere Formulierung.
 * Innerhalb eines Tages wird eine schon benutzte Formulierung übersprungen, solange es eine andere gibt.
 */
function pick(options: readonly string[], seed: number): string {
  // einfache Streufunktion (ganzzahlig), damit benachbarte Seeds nicht dieselbe Wahl treffen
  let x = (seed ^ 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x45d9f3b) >>> 0
  // „>>> 0“ macht die Zahl positiv – sonst könnte der Index negativ werden
  const start = ((x ^ (x >>> 16)) >>> 0) % options.length
  for (let k = 0; k < options.length; k++) {
    const option = options[(start + k) % options.length]
    if (!usedToday?.has(option)) {
      usedToday?.add(option)
      return option
    }
  }
  return options[start]
}

/** Zahl wie im Deutschen üblich, gerundet */
function deg(v: number): string {
  return `${Math.round(v)}`.replace('-', '−')
}

function meters(h: number): string {
  return `${Math.round(h / 50) * 50} m`
}

/** Erster Buchstabe groß */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ---------- Satz 1: Himmel, Niederschlag, Gewitter, Nebel ----------

type PrecipKind = 'rain' | 'sleet' | 'snow'

function precipKind(s: PeriodStats): PrecipKind {
  const snowWater = s.snow * SNOW_CM_TO_MM
  const share = s.precip > 0 ? snowWater / s.precip : 0
  if (share >= SNOW_SHARE.snow) return 'snow'
  if (share >= SNOW_SHARE.mixed) return 'sleet'
  return 'rain'
}

const PRECIP_WORDS: Record<PrecipKind, { light: string[]; normal: string[]; heavy: string[] }> = {
  rain: {
    light: ['zeitweise leichter Regen', 'ab und zu ein paar Tropfen', 'gelegentlich etwas Nieselregen'],
    normal: ['Regen', 'immer wieder Regen', 'zeitweise Regen'],
    heavy: ['kräftiger Regen', 'ergiebiger Regen', 'teils starker Regen'],
  },
  sleet: {
    light: ['etwas Schneeregen', 'zeitweise leichter Schneeregen'],
    normal: ['Schneeregen', 'nasser Schnee und Regen gemischt'],
    heavy: ['kräftiger Schneeregen', 'viel nasser Schnee, mit Regen vermischt'],
  },
  snow: {
    light: ['ein paar Schneeflocken', 'leichter Schneefall', 'etwas Schnee'],
    normal: ['Schneefall', 'immer wieder Schnee'],
    heavy: ['kräftiger Schneefall', 'ergiebiger Schneefall'],
  },
}

/** Himmel ohne Niederschlag */
function skyWords(s: PeriodStats, seed: number): string {
  if (s.night) {
    if (s.cloud < CLOUD.clear) return pick(['Klarer Himmel.', 'Sternenklar.', 'Meist wolkenlos.'], seed)
    if (s.cloud < CLOUD.few) return pick(['Überwiegend klar, nur einzelne Wolken.', 'Meist klar mit ein paar Wolken.'], seed)
    if (s.cloud < CLOUD.broken) return pick(['Wolkig, aber trocken.', 'Teils bewölkt, es bleibt trocken.'], seed)
    return pick(['Bedeckt, aber trocken.', 'Dichte Wolken, aber kein Regen.'], seed)
  }
  if (s.cloud < CLOUD.clear) return pick(['Sonnig.', 'Viel Sonne.', 'Strahlender Sonnenschein.', 'Kaum eine Wolke am Himmel.'], seed)
  if (s.cloud < CLOUD.few)
    return pick(['Heiter, nur ein paar Wolken.', 'Freundlich mit lockeren Wolken.', 'Sonne und einige Wolken wechseln sich ab.'], seed)
  if (s.cloud < CLOUD.broken)
    return pick(
      ['Wechselnd bewölkt, aber trocken.', 'Mehr Wolken als Sonne, es bleibt trocken.', 'Oft bewölkt, die Sonne zeigt sich nur zeitweise.'],
      seed,
    )
  return pick(['Bedeckt und trüb, aber trocken.', 'Eine graue Wolkendecke, es bleibt trocken.', 'Kaum Sonne, der Himmel bleibt grau.'], seed)
}

/**
 * Himmelszustand als Einleitung für einen Satz mit Niederschlag. Endet so, dass jedes Wort aus
 * PRECIP_WORDS grammatisch passt („…, dazu kräftiger Regen“ / „…, dazu ein paar Schneeflocken“).
 */
function skyIntro(s: PeriodStats, seed: number): string {
  if (s.cloud < CLOUD.few) return pick(['Sonne und Wolken wechseln sich ab, dazu', 'Zwischendurch Sonne, aber auch'], seed)
  if (s.cloud < CLOUD.broken) return pick(['Wechselnd bewölkt, dazu', 'Viele Wolken und'], seed)
  return pick(['Bedeckt, dazu', 'Graue Wolken und', 'Trüb und nass:'], seed)
}

/** Gewitter-Zusatz oder leer */
function thunderClause(s: PeriodStats, seed: number): string {
  const likely = s.thunderShare >= THUNDER.likely
  const possible =
    s.thunderShare >= THUNDER.possible || (s.cape !== null && s.cape >= THUNDER.cape && s.thunderShare >= THUNDER.capeShare)
  if (!likely && !possible) return ''
  const capeText = s.cape !== null && s.cape >= THUNDER.mentionCape ? ` (CAPE um ${Math.round(s.cape / 100) * 100} J/kg)` : ''
  return likely
    ? pick([` – Gewitter sind wahrscheinlich${capeText}`, ` – mit Gewittern ist zu rechnen${capeText}`], seed)
    : pick([` – einzelne Gewitter sind möglich${capeText}`, ` – ein Gewitter ist nicht ausgeschlossen${capeText}`], seed)
}

interface FogInfo {
  /** Nebel laut Temperaturprofil (Inversion mit feuchter Schicht) */
  fog: boolean
  fogTop: number | null
  fogFromGround: boolean
}

/** Regnet/schneit es im Abschnitt nennenswert? */
function isWet(s: PeriodStats): boolean {
  return s.precip >= PRECIP.trace && s.wetShare >= WET_SHARE_DRY
}

/** Nebel: aus dem Profil (Berg & Tal), der Messung oder dem Wettercode der Modelle – nur wenn es nicht regnet */
function fogSentenceApplies(s: PeriodStats, fog: FogInfo | null): boolean {
  return !isWet(s) && (!!fog?.fog || s.fogShare >= FOG_SHARE)
}

function weatherSentence(s: PeriodStats, seed: number, fog: FogInfo | null): string {
  const wet = isWet(s)
  const thunder = thunderClause(s, seed + 7)

  if (fogSentenceApplies(s, fog)) {
    const kind = fog?.fog ? (fog.fogFromGround ? 'Nebel' : 'Hochnebel') : 'Nebel oder Hochnebel'
    const top = fog?.fogTop != null ? `, die Obergrenze liegt bei etwa ${meters(fog.fogTop)}` : ''
    return pick(
      [`${kind} hält sich, es bleibt trüb${top}.`, `Grau in grau: ${kind}${top}.`, `${cap(kind)} dämpft das Licht, kaum Sonne${top}.`],
      seed,
    )
  }

  if (wet) {
    const kind = precipKind(s)
    const words = PRECIP_WORDS[kind]
    const amount = s.precip < PRECIP.light ? words.light : s.precip < PRECIP.moderate ? words.normal : words.heavy
    const what = pick(amount, seed + 3)
    // Regen bei Frost gefriert sofort am Boden → Glatteis
    const ice = kind !== 'snow' && s.tempMean <= TEMP.frost ? ' – Achtung, Glätte durch gefrierenden Regen möglich' : ''
    return `${skyIntro(s, seed)} ${what}${ice || thunder}.`
  }

  const sky = skyWords(s, seed)
  return thunder ? `${sky.slice(0, -1)}${thunder}.` : sky
}

// ---------- Satz 2: Temperatur und Wind ----------

function tempWindSentence(s: PeriodStats, seed: number): string {
  const a = deg(s.tempStart)
  const b = deg(s.tempEnd)
  const m = deg(s.tempMean)
  const change = s.tempEnd - s.tempStart
  let temp: string
  if (change >= TEMP.trend) {
    temp = pick([`Die Temperatur steigt von ${a} auf ${b} °C`, `Es wird wärmer, von ${a} auf ${b} °C`, `Die Temperaturen klettern von ${a} auf ${b} °C`], seed)
  } else if (change <= -TEMP.trend) {
    temp = pick([`Es kühlt von ${a} auf ${b} °C ab`, `Die Temperatur sinkt von ${a} auf ${b} °C`, `Es wird kühler, von ${a} auf ${b} °C`], seed)
  } else if (s.tempMean <= TEMP.frost) {
    temp = pick([`Frostig bei etwa ${m} °C`, `Mit rund ${m} °C bleibt es frostig`, `Weiterhin Frost, um ${m} °C`], seed)
  } else if (s.tempMean >= TEMP.hot) {
    temp = pick([`Heiß mit etwa ${m} °C`, `Hochsommerlich heiß, rund ${m} °C`], seed)
  } else {
    temp = pick([`Um ${m} °C`, `Die Temperatur liegt bei etwa ${m} °C`, `Rund ${m} °C`], seed)
  }

  const g = Math.round(s.gust / 5) * 5
  let wind = ''
  if (s.gust >= WIND.storm) wind = pick([`, dazu Sturmböen bis ${g} km/h`, `, Achtung: Sturmböen bis ${g} km/h`], seed + 1)
  else if (s.gust >= WIND.gust) wind = pick([`, dazu Böen bis ${g} km/h`, `, in Böen bis ${g} km/h`], seed + 1)
  else if (s.wind >= WIND.strong) wind = pick([', bei kräftigem Wind', ', dazu kräftiger Wind'], seed + 1)
  else if (s.wind >= WIND.breezy) wind = pick([', bei lebhaftem Wind', ', dazu ein frischer Wind'], seed + 1)
  return `${temp}${wind}.`
}

// ---------- Satz 3: Uneinigkeit der Modelle ----------

function uncertaintySentence(s: PeriodStats, when: string, seed: number): string {
  if (s.models < 3) return pick([`Nur ${s.models} Modelle rechnen so weit – ein grober Trend.`, `Wenige Modelle (${s.models}) – der Text ist nur ein grober Trend.`], seed)

  const topics: string[] = []
  let precipNote = ''
  if (s.wetShare >= WET_SHARE_UNSURE[0] && s.wetShare <= WET_SHARE_UNSURE[1]) {
    const kind = precipKind(s)
    topics.push(kind === 'snow' ? 'beim Schnee' : kind === 'sleet' ? 'beim Niederschlag' : 'beim Regen')
    precipNote = ` (${s.wetModels} von ${s.models} rechnen damit)`
  }
  if (s.tempSpread > TEMP.spread) topics.push('bei der Temperatur')
  if (s.cloudSpread > CLOUD_SPREAD) topics.push('bei der Bewölkung')
  if (topics.length === 0) return ''

  const list = topics.length === 1 ? topics[0] : `${topics.slice(0, -1).join(', ')} und ${topics[topics.length - 1]}`
  return pick(
    [
      `Die Modelle sind sich ${list} ${when} uneinig${precipNote}.`,
      `${cap(when)} gehen die Modelle ${list} auseinander${precipNote}.`,
      `Unsicher: ${cap(list)} ${when} widersprechen sich die Modelle${precipNote}.`,
    ],
    seed,
  )
}

// ---------- Alles zusammen ----------

export interface PeriodText {
  key: string
  label: string
  /** z. B. „6–11 Uhr“ */
  hours: string
  /** Startzeit des Abschnitts (wie MultiModelForecast.times) – um „vorbei“ zu erkennen */
  start: number
  end: number
  /** Text für das Tal bzw. den Ort */
  valley: string[]
  /** Nur bei Inversion: eigener Text für den Berg */
  mountain: string[] | null
  /** Inversion in diesem Abschnitt? */
  inversion: boolean
}

export interface DayCourseInput {
  /** Vorhersage für den Ort bzw. das Tal */
  forecast: MultiModelForecast
  /** Index der Mitternacht des Tages in forecast.times */
  startIndex: number
  /** Modelle, die einfließen (Standard: alle verfügbaren) */
  modelIds?: string[]
  /** Nur Berg & Tal: Inversion je Stunde (aus dem Temperaturprofil) */
  inversions?: HourInversion[]
  /** Nur Berg & Tal: Gipfel-Vorhersage (Temperatur aus der freien Atmosphäre) und Gipfelhöhe */
  summit?: MultiModelForecast | null
  summitElevation?: number
  /**
   * Nebel laut Messstation (Etappe 14c): Zeitfenster in der Zeitrechnung der Vorhersage
   * und gemessene Feuchte. Abschnitte, die das Fenster berühren, beschreiben Nebel –
   * auch wenn die Modelle trockener rechnen (siehe measuredFogWindow in stations.ts).
   */
  measuredFog?: { from: number; to: number; humidity: number } | null
}

/** Inversion in einem Abschnitt: wenn mindestens die Hälfte der Stunden eine zeigt. */
function periodInversion(inv: HourInversion[] | undefined, from: number, to: number): (FogInfo & { strength: number | null }) | null {
  if (!inv) return null
  const hours = inv.slice(from, to)
  const withInv = hours.filter((h) => h.inversion)
  if (hours.length === 0 || withInv.length < hours.length / 2) return null
  const fogHours = withInv.filter((h) => h.fog)
  const fog = fogHours.length >= withInv.length / 2
  return {
    fog,
    fogTop: fog ? median(nums(fogHours.map((h) => h.fogTop))) : null,
    fogFromGround: fog && fogHours.filter((h) => h.fogFromGround).length >= fogHours.length / 2,
    strength: median(nums(withInv.map((h) => h.strength))),
  }
}

/** Gipfeltext bei Inversion: über oder im Nebel, und wie viel milder als im Tal */
function mountainSentences(
  summit: MultiModelForecast,
  ids: string[],
  from: number,
  to: number,
  valley: PeriodStats,
  inv: FogInfo,
  elevation: number,
  seed: number,
): string[] {
  const aboveFog = inv.fog && inv.fogTop !== null && elevation > inv.fogTop + ABOVE_FOG_M
  // Über dem Nebel zählen nur mittlere und hohe Wolken – die tiefen liegen ja unten im Tal
  const upperCloud = (id: string, i: number) => {
    const mid = summit.extra.cloud_cover_mid?.[id]?.[i] ?? null
    const high = summit.extra.cloud_cover_high?.[id]?.[i] ?? null
    return mid === null && high === null ? null : Math.max(mid ?? 0, high ?? 0)
  }
  const s = periodStats(summit, ids, from, to, aboveFog ? upperCloud : undefined)
  if (!s) return []

  const out: string[] = []
  if (aboveFog) {
    out.push(
      s.cloud < CLOUD.few
        ? pick(['Oben über dem Nebelmeer scheint die Sonne.', 'Über der Nebeldecke sonnig – mit Blick aufs Nebelmeer.'], seed)
        : pick(['Über dem Nebel, aber auch oben ziehen Wolken durch.', 'Der Gipfel liegt über dem Nebel, darüber gibt es aber Wolken.'], seed),
    )
  } else if (inv.fog) {
    out.push(pick(['Der Gipfel steckt wohl selbst im Nebel.', 'Auch oben bleibt es neblig-trüb.'], seed))
  } else {
    out.push(weatherSentence(s, seed, null))
  }
  const diff = s.tempMean - valley.tempMean
  const t = deg(s.tempMean)
  out.push(
    diff >= 1
      ? pick([`Mit etwa ${t} °C um ${Math.round(diff)} °C milder als im Tal.`, `Oben ist es mit rund ${t} °C wärmer als unten.`], seed + 2)
      : pick([`Etwa ${t} °C.`, `Rund ${t} °C am Gipfel.`], seed + 2),
  )
  return out
}

/** Beschreibt einen Tag in vier Abschnitten. */
export function describeDayCourse(input: DayCourseInput): PeriodText[] {
  const { forecast: fc, startIndex } = input
  const ids = input.modelIds ?? fc.availableModels
  // Grundlage für die Abwechslung: Tag (in Tagen seit 1970) – damit wechseln die Formulierungen täglich
  const daySeed = Math.round((fc.times[startIndex] ?? 0) / 86_400_000)
  usedToday = new Set()
  try {
    return describePeriods(input, fc, startIndex, ids, daySeed)
  } finally {
    usedToday = null
  }
}

function describePeriods(input: DayCourseInput, fc: MultiModelForecast, startIndex: number, ids: string[], daySeed: number): PeriodText[] {
  return PERIODS.map((p, k) => {
    const from = startIndex + p.from
    const to = startIndex + p.to
    const seed = daySeed * 7 + k * 101
    const s = periodStats(fc, ids, from, to)
    const base = {
      key: p.key,
      label: p.label,
      hours: `${p.from}–${p.to} Uhr`,
      start: fc.times[from] ?? 0,
      end: fc.times[Math.min(to, fc.times.length - 1)] ?? 0,
    }
    if (!s) return { ...base, valley: ['Für diesen Abschnitt liefern die Modelle keine Daten.'], mountain: null, inversion: false }

    const inv = periodInversion(input.inversions, from, to)
    // Gemessener Nebel in diesem Abschnitt? Dann gilt für das TAL Nebel (der Berg-Text bleibt beim Modellprofil)
    const mf = input.measuredFog
    const fogMeasured = !!mf && base.start < mf.to && base.end > mf.from
    const valleyFog: FogInfo | null = fogMeasured && !inv?.fog ? { fog: true, fogTop: inv?.fogTop ?? null, fogFromGround: true } : inv
    // Gemessener Nebel: die Messung an den Nebel-Satz anhängen (kein eigener Satz – höchstens 3 Sätze je Abschnitt)
    const fogSentence = weatherSentence(s, seed, valleyFog)
    const weather =
      fogMeasured && mf && fogSentenceApplies(s, valleyFog)
        ? `${fogSentence.slice(0, -1)} ${pick([`(gemessen: ${Math.round(mf.humidity)} % Feuchte)`, `– die Messstation meldet ${Math.round(mf.humidity)} % Feuchte`], seed + 61)}.`
        : fogSentence
    const tempWind = tempWindSentence(s, seed + 13)
    // Die Uneinigkeit der Modelle muss immer im Text stehen (CLAUDE.md) – sie hat Vorrang vor Zusatzsätzen
    const unsure = uncertaintySentence(s, p.when, seed + 29)

    // Bei Inversion: Tal und Berg getrennt beschreiben
    let mountain: string[] | null = null
    let invNote = ''
    if (inv && input.summit && input.summitElevation !== undefined) {
      // ohne Nebel ein kurzer Hinweis auf die kalte Luft im Tal – aber nur, wenn noch Platz ist (max. 3 Sätze)
      if (!inv.fog && !unsure && inv.strength !== null && inv.strength >= 1) {
        invNote = pick(['Kalte Luft liegt im Tal.', 'Im Tal sammelt sich kalte Luft.', 'Unten ist es kälter als weiter oben.'], seed + 41)
      }
      mountain = mountainSentences(input.summit, ids, from, to, s, inv, input.summitElevation, seed + 53)
    }
    const valley = [weather, invNote, tempWind, unsure].filter((x) => x !== '')
    return { ...base, valley, mountain, inversion: inv !== null }
  })
}
