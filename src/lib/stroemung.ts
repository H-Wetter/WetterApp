/**
 * Strömung und Luftmasse über Österreich (Etappe 18b).
 *
 * Drei Fragen beantwortet diese Datei für einen Tag:
 * 1. Woher strömt die Luft? Aus der Höhe der 500-hPa-Fläche (rund 5500 m) und dem Wind in 700 hPa (rund 3000 m).
 * 2. Wird es wärmer oder kälter? Temperatur in 850 hPa (rund 1500 m) im Vergleich zu den zwei Vortagen.
 *    Diese Höhe nimmt man, weil dort der Boden (Sonne, Nebel, Nacht) die Temperatur kaum noch verfälscht.
 * 3. Zieht eine Front durch? Wenn sich Temperatur und Windrichtung in kurzer Zeit stark ändern.
 *
 * Alle Schwellenwerte stehen gleich hier oben und lassen sich anpassen.
 */
import type { Alpenpunkt } from '../data/alpenpunkte'
import type { AlpenDaten, AlpenVariable } from '../types/grosswetterlage'
import { meanWindDirection } from './wind'

/** Ab so vielen Grad Unterschied zu den Vortagen (850 hPa) sprechen wir von Warm- bzw. Kaltluftzufuhr. */
export const LUFTMASSE_DIFF_GRAD = 4
/** Front: Die Temperatur in 850 hPa ändert sich um mindestens so viele Grad … */
export const FRONT_TEMP_GRAD = 5
/** … innerhalb von so vielen Stunden … */
export const FRONT_STUNDEN = 12
/** … und der Wind in 700 hPa dreht dabei um mindestens so viele Grad. */
export const FRONT_WINDDREHUNG_GRAD = 45
/** Front: Der Wind in 700 hPa muss vorher und nachher mindestens so stark sein (km/h). Bei schwachem Wind sagt die Richtung wenig. */
export const FRONT_MIN_WIND_KMH = 20
/** Schwache Strömung: Wind in 700 hPa unter diesem Wert (km/h) … */
export const SCHWACH_700_KMH = 15
/** … und Höhenströmung in 500 hPa unter diesem Wert (km/h). */
export const SCHWACH_500_KMH = 25

const HOUR = 3600 * 1000

export interface Richtung {
  /** Grad, WOHER die Luft kommt (0 = Nord, 90 = Ost) */
  grad: number
  /** Geschwindigkeit in km/h */
  kmh: number
}

export interface Stroemung {
  /** Höhenströmung in rund 5500 m, berechnet aus dem Gefälle der 500-hPa-Fläche */
  hoehe: Richtung | null
  /** Wind in rund 3000 m (700 hPa), Mittel über Österreich */
  wind700: Richtung | null
  /** Beide schwach: Die Luft kommt kaum voran. */
  schwach: boolean
}

export interface Luftmasse {
  /** Temperatur in 850 hPa am gewählten Tag (Tagesmittel über Österreich), °C */
  t850: number
  /** Unterschied zum Mittel der zwei Vortage in Grad, `null` = Vortage fehlen */
  diff: number | null
  art: 'warm' | 'kalt' | 'gleich'
}

export interface Front {
  art: 'Kaltfront' | 'Warmfront'
  /** Zeitpunkt der stärksten Änderung (ms, echte UTC-Zeit) */
  zeit: number
  /** Temperaturänderung in 850 hPa innerhalb von FRONT_STUNDEN (negativ = kälter) */
  diffGrad: number
  /** Windrichtung in 700 hPa vorher und nachher (Grad) */
  windVorher: number
  windNachher: number
}

// ---------- Hilfen ----------

function mean(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : null
}

/** Mittel einer Variable über die Modelle an einem Punkt und Zeitpunkt */
function modelMean(data: AlpenDaten, punktId: string, variable: AlpenVariable, ti: number, models: string[]): number | null {
  return mean(models.map((m) => data.werte[punktId]?.[m]?.[variable]?.[ti] ?? null))
}

/** Index des Zeitpunkts, der `time` am nächsten liegt (-1, wenn mehr als 3 Stunden daneben) */
function nearestIndex(times: number[], time: number): number {
  let best = -1
  for (let i = 0; i < times.length; i++) {
    if (best < 0 || Math.abs(times[i] - time) < Math.abs(times[best] - time)) best = i
  }
  return best >= 0 && Math.abs(times[best] - time) <= 3 * HOUR ? best : -1
}

/** Alle Zeit-Indizes eines Tages (Mitternacht bis Mitternacht) */
function dayIndices(times: number[], dayStart: number): number[] {
  const out: number[] = []
  times.forEach((t, i) => {
    if (t >= dayStart && t < dayStart + 24 * HOUR) out.push(i)
  })
  return out
}

/** Kleinster Winkel zwischen zwei Richtungen (0–180°) */
export function winkelDifferenz(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return d > 180 ? 360 - d : d
}

/**
 * Legt durch Werte an mehreren Orten eine schräge Ebene (kleinste Quadrate) und liefert ihre Neigung:
 * Änderung des Werts je Meter nach Osten (dx) und nach Norden (dy). Gebraucht für die Höhenströmung
 * (Neigung der 500-hPa-Fläche) und für das Druckgefälle über Österreich (Sturm, Etappe 18d).
 */
export function ebenenNeigung(pts: { lat: number; lon: number; wert: number }[]): { dx: number; dy: number; lat0: number } | null {
  if (pts.length < 3) return null
  const rad = Math.PI / 180
  const lat0 = pts.reduce((s, e) => s + e.lat, 0) / pts.length
  const lon0 = pts.reduce((s, e) => s + e.lon, 0) / pts.length
  const w0 = pts.reduce((s, e) => s + e.wert, 0) / pts.length
  let sxx = 0
  let sxy = 0
  let syy = 0
  let sxz = 0
  let syz = 0
  for (const e of pts) {
    // Abstand zum Schwerpunkt in Metern: x nach Osten, y nach Norden
    const x = (e.lon - lon0) * rad * 6371000 * Math.cos(lat0 * rad)
    const y = (e.lat - lat0) * rad * 6371000
    const z = e.wert - w0
    sxx += x * x
    sxy += x * y
    syy += y * y
    sxz += x * z
    syz += y * z
  }
  const det = sxx * syy - sxy * sxy
  if (Math.abs(det) < 1e-6) return null
  return { dx: (sxz * syy - syz * sxy) / det, dy: (syz * sxx - sxz * sxy) / det, lat0 }
}

// ---------- 1. Strömung ----------

/**
 * Wind in 700 hPa: Mittel über alle Punkte in Österreich und alle Modelle.
 * Richtungen werden als Pfeile gemittelt (siehe wind.ts).
 */
export function wind700(data: AlpenDaten, punkte: Alpenpunkt[], ti: number, models: string[] = data.models): Richtung | null {
  const pairs = punkte
    .filter((p) => p.inOesterreich)
    .flatMap((p) =>
      models.map((m) => ({
        direction: data.werte[p.id]?.[m]?.wind_direction_700hPa?.[ti] ?? null,
        speed: data.werte[p.id]?.[m]?.wind_speed_700hPa?.[ti] ?? null,
      })),
    )
  const kmh = mean(pairs.map((p) => p.speed))
  const direction = meanWindDirection(pairs)
  if (kmh === null || direction.degrees === null) return null
  return { grad: direction.degrees, kmh }
}

/**
 * Höhenströmung aus der 500-hPa-Fläche.
 *
 * Idee: In der Höhe weht der Wind entlang der Linien gleicher Höhe dieser Fläche, mit der tieferen
 * Seite links (auf der Nordhalbkugel). Je steiler die Fläche geneigt ist, desto stärker der Wind
 * („geostrophischer Wind“). Wir legen durch die Werte an allen Punkten eine schräge Ebene
 * (kleinste Quadrate) und lesen daraus Neigung und Richtung ab.
 */
export function hoehenstroemung(data: AlpenDaten, punkte: Alpenpunkt[], ti: number, models: string[] = data.models): Richtung | null {
  const rad = Math.PI / 180
  const pts = punkte
    .map((p) => ({ p, z: modelMean(data, p.id, 'geopotential_height_500hPa', ti, models) }))
    .filter((e): e is { p: Alpenpunkt; z: number } => e.z !== null)
  const ebene = ebenenNeigung(pts.map((e) => ({ lat: e.p.lat, lon: e.p.lon, wert: e.z })))
  if (!ebene) return null
  const { dx: dzdx, dy: dzdy, lat0 } = ebene

  // Erdbeschleunigung geteilt durch den Coriolis-Faktor der Breite
  const gOverF = 9.81 / (2 * 7.292e-5 * Math.sin(lat0 * rad))
  const u = -gOverF * dzdy // nach Osten, m/s
  const v = gOverF * dzdx // nach Norden, m/s
  const kmh = Math.hypot(u, v) * 3.6
  // Richtung, AUS der die Luft kommt
  const grad = ((Math.atan2(-u, -v) * 180) / Math.PI + 360) % 360
  return { grad, kmh }
}

/** Strömung über Österreich am gewählten Tag (Zeitpunkt: 12 Uhr UTC). */
export function analyseStroemung(data: AlpenDaten, punkte: Alpenpunkt[], dayStart: number, models: string[] = data.models): Stroemung | null {
  const ti = nearestIndex(data.times, dayStart + 12 * HOUR)
  if (ti < 0) return null
  const hoehe = hoehenstroemung(data, punkte, ti, models)
  const w700 = wind700(data, punkte, ti, models)
  if (!hoehe && !w700) return null
  const schwach = (w700 === null || w700.kmh < SCHWACH_700_KMH) && (hoehe === null || hoehe.kmh < SCHWACH_500_KMH)
  return { hoehe, wind700: w700, schwach }
}

// ---------- 2. Luftmasse ----------

/** Temperatur in 850 hPa: Mittel über Österreich, die Modelle und alle Zeitpunkte des Tages */
function t850Tag(data: AlpenDaten, punkte: Alpenpunkt[], dayStart: number, models: string[]): number | null {
  const indices = dayIndices(data.times, dayStart)
  return mean(indices.flatMap((ti) => punkte.filter((p) => p.inOesterreich).map((p) => modelMean(data, p.id, 'temperature_850hPa', ti, models))))
}

/** Warmluft oder Kaltluft? Vergleich der Temperatur in 850 hPa mit dem Mittel der zwei Vortage. */
export function analyseLuftmasse(data: AlpenDaten, punkte: Alpenpunkt[], dayStart: number, models: string[] = data.models): Luftmasse | null {
  const t850 = t850Tag(data, punkte, dayStart, models)
  if (t850 === null) return null
  const vortage = mean([t850Tag(data, punkte, dayStart - 24 * HOUR, models), t850Tag(data, punkte, dayStart - 48 * HOUR, models)])
  const diff = vortage === null ? null : t850 - vortage
  const art = diff === null || Math.abs(diff) < LUFTMASSE_DIFF_GRAD ? 'gleich' : diff > 0 ? 'warm' : 'kalt'
  return { t850, diff, art }
}

// ---------- 3. Front ----------

/**
 * Sucht am gewählten Tag den stärksten Temperatursprung in 850 hPa innerhalb von FRONT_STUNDEN.
 * Eine Front melden wir nur, wenn dabei auch der Wind in 700 hPa deutlich dreht.
 */
export function findeFront(data: AlpenDaten, punkte: Alpenpunkt[], dayStart: number, models: string[] = data.models): Front | null {
  const inland = punkte.filter((p) => p.inOesterreich)
  const tAt = (ti: number) => mean(inland.map((p) => modelMean(data, p.id, 'temperature_850hPa', ti, models)))
  let best: Front | null = null

  // Fenster, die bis zu FRONT_STUNDEN nach Mitternacht enden, zählen mit: Sonst ginge eine Front am späten Abend verloren.
  const candidates = data.times.map((t, i) => (t >= dayStart && t < dayStart + (24 + FRONT_STUNDEN) * HOUR ? i : -1)).filter((i) => i >= 0)
  for (const ti of candidates) {
    const before = nearestIndex(data.times, data.times[ti] - FRONT_STUNDEN * HOUR)
    if (before < 0 || before === ti) continue
    const tNow = tAt(ti)
    const tBefore = tAt(before)
    const windNow = wind700(data, punkte, ti, models)
    const windBefore = wind700(data, punkte, before, models)
    if (tNow === null || tBefore === null || !windNow || !windBefore) continue
    const diffGrad = tNow - tBefore
    if (Math.abs(diffGrad) < FRONT_TEMP_GRAD) continue
    if (winkelDifferenz(windNow.grad, windBefore.grad) < FRONT_WINDDREHUNG_GRAD) continue
    if (windNow.kmh < FRONT_MIN_WIND_KMH || windBefore.kmh < FRONT_MIN_WIND_KMH) continue

    // Zeitpunkt: der Schritt mit der stärksten Änderung innerhalb des Fensters
    let zeit = data.times[ti]
    let steepest = 0
    for (let i = before + 1; i <= ti; i++) {
      const a = tAt(i - 1)
      const b = tAt(i)
      if (a === null || b === null) continue
      if (Math.abs(b - a) > steepest) {
        steepest = Math.abs(b - a)
        zeit = (data.times[i - 1] + data.times[i]) / 2
      }
    }
    // Die Front gehört zu dem Tag, an dem die stärkste Änderung liegt. So steht sie nur bei EINEM Tag.
    if (zeit < dayStart || zeit >= dayStart + 24 * HOUR) continue
    if (best && Math.abs(best.diffGrad) >= Math.abs(diffGrad)) continue
    best = { art: diffGrad < 0 ? 'Kaltfront' : 'Warmfront', zeit, diffGrad, windVorher: windBefore.grad, windNachher: windNow.grad }
  }
  return best
}

// ---------- Texte ----------

const AUS = ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten']
const KURZ = ['Nord', 'Nordost', 'Ost', 'Südost', 'Süd', 'Südwest', 'West', 'Nordwest']

function sektor(grad: number): number {
  return Math.round((((grad % 360) + 360) % 360) / 45) % 8
}

/** 315 → „Nordwesten“ (für „aus Nordwesten“) */
export function richtungName(grad: number): string {
  return AUS[sektor(grad)]
}

/** 315 → „Nordwest“ (für „von Südwest auf Nordwest“) */
export function richtungKurz(grad: number): string {
  return KURZ[sektor(grad)]
}

/** Auf 5 km/h gerundet, damit die Zahl nicht genauer wirkt, als sie ist */
function kmhText(kmh: number): string {
  return `rund ${Math.round(kmh / 5) * 5} km/h`
}

function gradText(value: number): string {
  return `${Math.round(value)}`.replace('-', '−')
}

/** Tageszeit in Österreich zu einem echten UTC-Zeitpunkt, z. B. „am Nachmittag“ */
export function tageszeit(ms: number): string {
  const hour = Number(new Intl.DateTimeFormat('de-AT', { timeZone: 'Europe/Vienna', hour: 'numeric', hourCycle: 'h23' }).format(ms).replace(/\D/g, ''))
  if (hour < 5) return 'in der Nacht'
  if (hour < 8) return 'in der Früh'
  if (hour < 11) return 'am Vormittag'
  if (hour < 14) return 'um die Mittagszeit'
  if (hour < 18) return 'am Nachmittag'
  if (hour < 22) return 'am Abend'
  return 'in der Nacht'
}

export function stroemungText(s: Stroemung): string {
  if (s.schwach) return 'Über Österreich weht auch in der Höhe nur schwacher Wind, die Luft kommt kaum voran.'
  const parts: string[] = []
  if (s.hoehe) parts.push(`In der Höhe (rund 5500 m) strömt die Luft aus ${richtungName(s.hoehe.grad)} nach Österreich`)
  if (s.wind700) {
    const wind = `aus ${richtungName(s.wind700.grad)} mit ${kmhText(s.wind700.kmh)}`
    parts.push(s.hoehe ? `in 3000 m weht der Wind ${wind}` : `In 3000 m weht der Wind ${wind}`)
  }
  return `${parts.join(', ')}.`
}

export function luftmasseText(l: Luftmasse): string {
  const basis = `In 1500 m Höhe hat es im Mittel ${gradText(l.t850)} °C`
  if (l.diff === null) return `${basis}.`
  if (l.art === 'gleich') return `${basis}, kaum anders als an den beiden Vortagen.`
  const betrag = Math.round(Math.abs(l.diff))
  return l.art === 'warm'
    ? `${basis}, das sind ${betrag} Grad mehr als an den beiden Vortagen: Es strömt Warmluft ein.`
    : `${basis}, das sind ${betrag} Grad weniger als an den beiden Vortagen: Es strömt Kaltluft ein.`
}

/**
 * @param now aktuelle Zeit (ms). Liegt die Front schon zurück, steht der Satz in der Vergangenheit.
 */
export function frontText(f: Front, now?: number): string {
  const grad = Math.round(Math.abs(f.diffGrad))
  if (now !== undefined && f.zeit < now) {
    const zeit = tageszeit(f.zeit)
    return (
      `${zeit.charAt(0).toUpperCase()}${zeit.slice(1)} ist eine ${f.art} durchgezogen: Die Temperatur in 1500 m ist binnen ${FRONT_STUNDEN} Stunden ` +
      `um ${grad} Grad ${f.diffGrad < 0 ? 'gesunken' : 'gestiegen'}, der Wind in 3000 m hat von ${richtungKurz(f.windVorher)} auf ${richtungKurz(f.windNachher)} gedreht.`
    )
  }
  const aenderung = f.diffGrad < 0 ? 'sinkt' : 'steigt'
  return (
    `Voraussichtlich zieht ${tageszeit(f.zeit)} eine ${f.art} durch: Die Temperatur in 1500 m ${aenderung} binnen ${FRONT_STUNDEN} Stunden ` +
    `um ${Math.round(Math.abs(f.diffGrad))} Grad, der Wind in 3000 m dreht von ${richtungKurz(f.windVorher)} auf ${richtungKurz(f.windNachher)}.`
  )
}
